const MatchResult = require("../entities/MatchResult");

class CompareExcelsUseCase {
  constructor(excelRepository) {
    this.excelRepository = excelRepository;
  }

  async execute(sourceFile, targetFile, onProgress) {
    const results = [];

    // Obtener TODAS las filas del Excel 1
    const sourceRows = await this.excelRepository.getAllRows(sourceFile);

    // Obtener TODAS las filas del Excel 2
    const targetRows = await this.excelRepository.getAllRows(targetFile);

    const targetIndex = this.createSearchIndex(
      targetRows,
      targetFile.searchColumns
    );
    console.log(
      `Índice creado con ${targetIndex.exact.size} códigos exactos, ${targetIndex.normalized.size} códigos normalizados, ${targetIndex.compact.size} códigos compactos y ${targetIndex.slashVariations.size} variaciones con barras`
    );

    const totalRows = sourceRows.length;
    let processedRows = 0;
    let exactMatches = 0;
    let noMatches = 0;
    let duplicatesSkipped = 0;

    // Map para rastrear filas completas ya procesadas (código -> hash de toda la fila)
    const processedRows_hash = new Map();

    // Para CADA fila del Excel 1
    for (const sourceRow of sourceRows) {
      // Obtener códigos de las columnas de búsqueda del Excel 1
      const sourceCodes = this.getCodesFromRow(
        sourceRow,
        sourceFile.searchColumns
      );

      // Crear un hash de toda la fila para detectar duplicados reales
      const rowHash = this.createRowHash(sourceRow);

      // Verificar si esta fila completa ya fue procesada
      const codeToCheck = sourceCodes.find(
        (code) => code && code.trim() !== ""
      );

      let alreadyProcessed = false;
      if (codeToCheck) {
        const trimmedCode = codeToCheck.trim();
        if (processedRows_hash.has(trimmedCode)) {
          // Solo es duplicado si el hash de toda la fila es igual
          const previousHash = processedRows_hash.get(trimmedCode);
          alreadyProcessed = previousHash === rowHash;
        }
      }

      if (alreadyProcessed) {
        // Omitir esta fila porque es un duplicado REAL (mismos códigos Y mismos datos)
        duplicatesSkipped++;
        processedRows++;

        if (onProgress) {
          onProgress(processedRows, totalRows);
        }
        continue;
      }

      let bestMatch = null;

      // Solo buscar si hay códigos válidos
      if (
        sourceCodes.length > 0 &&
        sourceCodes.some((code) => code && code.trim() !== "")
      ) {
        // Buscar en el índice (mucho más rápido)
        bestMatch = this.findMatchInIndex(sourceCodes, sourceRow, targetIndex);

        if (bestMatch) {
          if (bestMatch.isExact()) {
            exactMatches++;
          }
          // Marcar esta fila completa como procesada (código -> hash)
          sourceCodes.forEach((code) => {
            if (code && code.trim() !== "") {
              processedRows_hash.set(code.trim(), rowHash);
            }
          });
        } else {
          noMatches++;
          // También marcar como procesada la fila sin coincidencia
          sourceCodes.forEach((code) => {
            if (code && code.trim() !== "") {
              processedRows_hash.set(code.trim(), rowHash);
            }
          });
        }
      } else {
        noMatches++;
      }

      // SIEMPRE agregar la fila del Excel 1 al resultado (si no es duplicado)
      if (bestMatch) {
        results.push(bestMatch);
      } else {
        results.push(
          new MatchResult(sourceCodes[0] || "", sourceRow, null, "no_match", 0)
        );
      }

      processedRows++;
      if (onProgress) {
        onProgress(processedRows, totalRows);
      }

      // Log cada 1000 filas
      if (processedRows % 1000 === 0) {
        console.log(
          `Procesadas ${processedRows}/${totalRows} filas... (Exactas: ${exactMatches}, Sin coincidencia: ${noMatches}, Duplicados omitidos: ${duplicatesSkipped})`
        );
      }
    }
    return results;
  }

  // NUEVA FUNCIÓN: Crear índice de búsqueda
  createSearchIndex(targetRows, searchColumns) {
    const exactIndex = new Map(); // código exacto -> targetRow
    const normalizedIndex = new Map(); // código normalizado (guiones a espacios) -> targetRow
    const compactIndex = new Map(); // código compacto (sin guiones ni espacios) -> targetRow
    const slashVariationsIndex = new Map(); // variaciones con barras -> targetRow

    for (const targetRow of targetRows) {
      const codes = this.getCodesFromRow(targetRow, searchColumns);

      for (const code of codes) {
        if (!code || code.trim() === "") continue;

        const trimmedCode = code.trim();

        // Índice exacto (primera aparición)
        if (!exactIndex.has(trimmedCode)) {
          exactIndex.set(trimmedCode, targetRow);
        }

        // Índice normalizado (sin guiones, solo espacios)
        const normalizedCode = this.normalizeCode(trimmedCode);
        if (!normalizedIndex.has(normalizedCode)) {
          normalizedIndex.set(normalizedCode, targetRow);
        }

        // Índice compacto (sin guiones ni espacios)
        const compactCode = this.normalizeCodeCompact(trimmedCode);
        if (!compactIndex.has(compactCode)) {
          compactIndex.set(compactCode, targetRow);
        }

        // Nuevas variaciones con barras diagonales y backslashes
        const slashVariations = this.generateSlashVariations(trimmedCode);
        for (const variation of slashVariations) {
          if (!slashVariationsIndex.has(variation)) {
            slashVariationsIndex.set(variation, targetRow);
          }
        }
      }
    }

    return {
      exact: exactIndex,
      normalized: normalizedIndex,
      compact: compactIndex,
      slashVariations: slashVariationsIndex,
    };
  }

  // NUEVA FUNCIÓN: Buscar en el índice
  findMatchInIndex(sourceCodes, sourceRow, targetIndex) {
    // Primera pasada: buscar coincidencias exactas
    for (const sourceCode of sourceCodes) {
      if (!sourceCode || sourceCode.trim() === "") continue;

      const trimmedSource = sourceCode.trim();

      // Buscar coincidencia exacta
      if (targetIndex.exact.has(trimmedSource)) {
        const targetRow = targetIndex.exact.get(trimmedSource);
        return new MatchResult(sourceCode, sourceRow, targetRow, "exact", 100);
      }
    }

    // Segunda pasada: si no hay coincidencia exacta, buscar con códigos normalizados
    for (const sourceCode of sourceCodes) {
      if (!sourceCode || sourceCode.trim() === "") continue;

      const normalizedSource = this.normalizeCode(sourceCode);

      // Buscar coincidencia normalizada (ej: "ABC-123-D" coincide con "ABC 123 D")
      if (targetIndex.normalized.has(normalizedSource)) {
        const targetRow = targetIndex.normalized.get(normalizedSource);
        return new MatchResult(sourceCode, sourceRow, targetRow, "exact", 100);
      }
    }

    // Tercera pasada: si tampoco hay por espacios, buscar con código compacto sin guiones ni espacios
    for (const sourceCode of sourceCodes) {
      if (!sourceCode || sourceCode.trim() === "") continue;

      const compactSource = this.normalizeCodeCompact(sourceCode);

      if (targetIndex.compact.has(compactSource)) {
        const targetRow = targetIndex.compact.get(compactSource);
        return new MatchResult(sourceCode, sourceRow, targetRow, "exact", 100);
      }
    }

    // Cuarta pasada: buscar con variaciones de barras diagonales y backslashes
    for (const sourceCode of sourceCodes) {
      if (!sourceCode || sourceCode.trim() === "") continue;

      const slashVariations = this.generateSlashVariations(sourceCode);

      for (const variation of slashVariations) {
        if (targetIndex.slashVariations.has(variation)) {
          const targetRow = targetIndex.slashVariations.get(variation);
          return new MatchResult(
            sourceCode,
            sourceRow,
            targetRow,
            "exact",
            100
          );
        }
      }
    }

    return null;
  }

  getCodesFromRow(row, columns) {
    return columns
      .map((col) => {
        const value = row.getCellValue(col.index);
        return this.sanitizeValue(value);
      })
      .filter((v) => v !== null);
  }

  sanitizeValue(value) {
    if (!value) return null;

    if (typeof value === "object" && value.formula) {
      return null;
    }

    if (value.toString().includes("[object Object]")) {
      return null;
    }

    return value.toString().trim();
  }

  // Normalizar código: reemplaza guiones por espacios para búsquedas flexibles
  // Ejemplo: "ABC-123-D" -> "ABC 123 D"
  normalizeCode(code) {
    if (!code) return "";
    return code.toString().trim().replace(/-/g, " ");
  }

  // Normalización compacta: elimina guiones y espacios
  // Ejemplo: "ABC-123 D" -> "ABC123D"
  normalizeCodeCompact(code) {
    if (!code) return "";
    return code.toString().trim().replace(/[-\s]/g, "");
  }

  // Generar variaciones con barras diagonales y backslashes
  // Ejemplo: "ABC-123-D" -> incluye variaciones como: ABC/123/D, ABC//123-D, ABC-123/D, etc.
  generateSlashVariations(code) {
    if (!code) return [];
    const trimmedCode = code.toString().trim();

    const variations = new Set();

    // Variaciones básicas: reemplazar TODOS los guiones por el mismo separador
    variations.add(trimmedCode.replace(/-/g, "//")); // ABC-123-D -> ABC//123//D
    variations.add(trimmedCode.replace(/-/g, "/")); // ABC-123-D -> ABC/123/D
    variations.add(trimmedCode.replace(/-/g, "\\")); // ABC-123-D -> ABC\123\D
    variations.add(trimmedCode.replace(/-/g, "\\\\")); // ABC-123-D -> ABC\\123\\D

    // Variaciones mixtas: combinar guiones con barras
    // Esto genera todas las combinaciones posibles si hay múltiples guiones
    const parts = trimmedCode.split("-");

    if (parts.length > 1) {
      // Generar combinaciones con diferentes separadores
      const separators = ["/", "//", "\\", "\\\\", "-"];

      // Para códigos con 2 partes (ej: ABC-123)
      if (parts.length === 2) {
        for (const sep of separators) {
          if (sep !== "-") {
            variations.add(parts.join(sep));
          }
        }
      }

      // Para códigos con 3 partes (ej: ABC-123-D)
      if (parts.length === 3) {
        for (const sep1 of separators) {
          for (const sep2 of separators) {
            // Evitar duplicados con guiones puros (ya está en índice exacto)
            if (sep1 !== "-" || sep2 !== "-") {
              variations.add(`${parts[0]}${sep1}${parts[1]}${sep2}${parts[2]}`);
            }
          }
        }
      }

      // Para códigos con 4+ partes, generar combinaciones más comunes
      if (parts.length >= 4) {
        for (const sep of separators) {
          if (sep !== "-") {
            // Primera variación: todos con el mismo separador
            variations.add(parts.join(sep));

            // Segunda variación: primer guión cambiado, resto igual
            variations.add(`${parts[0]}${sep}${parts.slice(1).join("-")}`);

            // Tercera variación: último guión cambiado, resto igual
            variations.add(
              `${parts.slice(0, -1).join("-")}${sep}${parts[parts.length - 1]}`
            );
          }
        }
      }
    }

    return Array.from(variations);
  }

  // Crear un hash único de toda la fila para detectar duplicados reales
  createRowHash(row) {
    // row.cells es un Map, usar getAllCells() que retorna array de [index, value]
    const cellEntries = row.getAllCells();
    const values = cellEntries.map(([columnIndex, value]) => {
      if (!value) return "";
      if (typeof value === "object" && value.formula) return "";
      return value.toString().trim();
    });

    // Crear un hash simple concatenando todos los valores
    return values.join("|");
  }
}

module.exports = CompareExcelsUseCase;
