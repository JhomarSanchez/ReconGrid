const ExcelJS = require("exceljs");
const CatalogItem = require("../../domain/entities/CatalogItem");
const CatalogFile = require("../../domain/entities/CatalogFile");

/**
 * CatalogParser
 * Parser de archivos Excel de catálogos de vehículos
 */
class CatalogParser {
  /**
   * Normaliza un string para comparación
   */
  static normalize(str) {
    if (!str) return "";
    return str
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Convierte un valor de celda de Excel a string de forma segura
   * Maneja errores de Excel (#N/D, #REF!, etc.), fórmulas, rich text, etc.
   */
  static cellValueToString(cellValue) {
    if (!cellValue) return "";

    // Si es un string simple, retornarlo
    if (typeof cellValue === "string") {
      return cellValue.trim();
    }

    // Si es un número o booleano, convertir a string
    if (typeof cellValue === "number" || typeof cellValue === "boolean") {
      return cellValue.toString();
    }

    // Si es un objeto, verificar tipos especiales de ExcelJS
    if (typeof cellValue === "object") {
      // Rich text
      if (cellValue.richText && Array.isArray(cellValue.richText)) {
        return cellValue.richText
          .map((part) => part.text || "")
          .join("")
          .trim();
      }

      // Texto simple con formato
      if (cellValue.text !== undefined) {
        return cellValue.text.toString().trim();
      }

      // Errores de Excel (#N/D, #REF!, #DIV/0!, etc.)
      if (cellValue.error) {
        return ""; // Retornar vacío para errores
      }

      // Fórmulas con resultado
      if (cellValue.result !== undefined) {
        return this.cellValueToString(cellValue.result);
      }

      // Fecha
      if (cellValue instanceof Date) {
        return cellValue.toISOString().split("T")[0];
      }

      // Si llegamos aquí, es un objeto no reconocido - retornar vacío
      console.warn("Valor de celda no reconocido:", cellValue);
      return "";
    }

    return "";
  }

  /**
   * Parsea la cadena de vehículos (CAR CATALOGUE o VEHICULO MASTER)
   * Ejemplos válidos:
   * - "TOYOTA HILUX (2016-2020); NISSAN FRONTIER (2018-)"
   * - "RENAULT-9(1981,1986" (sin cierre de paréntesis)
   * - "CHEVROLET-N300 (2012,2017) 1.2" (con especificación adicional después)
   * - "FORD-ECOSPORT (2003,2012) 4X2" (con tracción después)
   */
  static parseVehicleString(vehicleString, lineaFabricanteString = "") {
    if (!vehicleString || typeof vehicleString !== "string") return [];

    const results = [];

    // Dividir por punto y coma
    const entries = vehicleString
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const entry of entries) {
      try {
        // Patrón mejorado que captura:
        // 1. MARCA-MODELO o MARCA MODELO
        // 2. (AÑO1, AÑO2) o (AÑO1-AÑO2) o (AÑO1,AÑO2 (sin cerrar)
        // 3. Información adicional después del paréntesis (opcional)
        // Soporta años de 2 o 4 dígitos
        const match = entry.match(
          /^(.*?)\s*\((\d{2,4})\s*[,\-]\s*(\d{2,4})?(.*)$/
        );

        if (match) {
          const vehicleInfo = match[1].trim();
          let desde = match[2];
          let hasta = match[3];
          const afterParenthesis = match[4]; // Captura todo después del año

          // Convertir años de 2 dígitos a 4 dígitos
          if (desde && desde.length === 2) {
            const year = parseInt(desde);
            // Si es mayor a 50, asumimos 19XX, si no 20XX
            desde = year > 50 ? `19${desde}` : `20${desde}`;
          }

          if (hasta && hasta.length === 2) {
            const year = parseInt(hasta);
            hasta = year > 50 ? `19${hasta}` : `20${hasta}`;
          } else if (!hasta) {
            hasta = new Date().getFullYear().toString();
          }

          // Extraer información adicional después del paréntesis
          // Esto puede contener: ") 1.2", ") 4X2", o simplemente más texto
          let additionalInfo = "";
          if (afterParenthesis) {
            // Remover el paréntesis de cierre si existe y extraer el resto
            const cleanedAfter = afterParenthesis
              .replace(/^\s*\)?\s*/, "") // Remover ) al inicio si existe
              .trim();

            if (cleanedAfter) {
              additionalInfo = cleanedAfter;
            }
          }

          // Extraer marca y modelo
          // Soporta tanto "MARCA-MODELO" como "MARCA MODELO"
          const parts = vehicleInfo.split(/[\s\-]+/).filter(Boolean);
          const marca = parts[0].toUpperCase();

          // El vehículo incluye el resto del nombre + información adicional
          let vehiculo = parts.slice(1).join(" ").trim();

          // Agregar información adicional al nombre del vehículo si existe
          if (additionalInfo) {
            vehiculo = vehiculo
              ? `${vehiculo} ${additionalInfo}`
              : additionalInfo;
          }

          // Validar que tengamos al menos marca y año
          if (marca && desde) {
            results.push({
              marca,
              vehiculo: vehiculo || marca, // Si no hay modelo, usar marca
              desde,
              hasta,
            });
          }
        } else {
          // Intentar un patrón más permisivo para casos edge
          // MARCA-MODELO (AÑO sin cerrar paréntesis
          const simpleMatch = entry.match(/^(.*?)\s*\((\d{2,4})/);
          if (simpleMatch) {
            const vehicleInfo = simpleMatch[1].trim();
            let desde = simpleMatch[2];

            // Convertir años de 2 dígitos a 4 dígitos
            if (desde && desde.length === 2) {
              const year = parseInt(desde);
              desde = year > 50 ? `19${desde}` : `20${desde}`;
            }

            const hasta = new Date().getFullYear().toString();

            const parts = vehicleInfo.split(/[\s\-]+/).filter(Boolean);
            const marca = parts[0].toUpperCase();
            const vehiculo = parts.slice(1).join(" ").trim() || marca;

            if (marca && desde) {
              results.push({
                marca,
                vehiculo,
                desde,
                hasta,
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error parseando entrada: "${entry}"`, error.message);
        // Continuar con la siguiente entrada
      }
    }

    return results;
  }

  /**
   * Obtiene el mapeo de headers de una fila
   * Retorna tanto el mapa normalizado como los headers originales con su caso preservado
   */
  static getHeaderMap(headerRow) {
    const headerMap = new Map();
    const originalHeaders = new Map(); // Mapa de índice de columna a header original

    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        const originalHeader = cell.value.toString();
        const normalizedHeader = this.normalize(originalHeader);
        headerMap.set(normalizedHeader, colNumber);
        originalHeaders.set(colNumber, originalHeader);
      }
    });

    return { headerMap, originalHeaders };
  }

  /**
   * Procesa una hoja de cálculo del Excel
   * @param {Object} worksheet - La hoja de Excel a procesar
   * @param {string} fileName - Nombre del archivo
   * @param {number} vehicleColumnIndex - Índice de la columna VEHICULO MASTER (REQUERIDO, 1-based)
   */
  static processWorksheet(worksheet, fileName, vehicleColumnIndex) {
    const results = [];
    const headerRow = worksheet.getRow(1);
    const { headerMap, originalHeaders } = this.getHeaderMap(headerRow);

    if (!vehicleColumnIndex) {
      throw new Error(
        "Se requiere índice de columna de vehículos para procesar la hoja"
      );
    }

    let totalDataRows = 0;
    let processedRows = 0;
    let errorRows = 0;
    const errorDetails = []; // Array para guardar detalles de errores

    // Procesar cada fila
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar header

      totalDataRows++;

      try {
        // Obtener valor de la celda de vehículos usando la función segura
        const vehicleCell = row.getCell(vehicleColumnIndex);
        const vehicleString = this.cellValueToString(vehicleCell?.value);
        const lineaFabricanteString = this.cellValueToString(
          row.getCell(headerMap.get("linea fabricante"))?.value
        );

        // Parsear vehículos
        const parsedVehicles = this.parseVehicleString(
          vehicleString,
          lineaFabricanteString
        );

        if (parsedVehicles.length === 0) {
          errorRows++;
          // Guardar detalles del error
          errorDetails.push({
            rowNumber,
            sheetName: worksheet.name,
            vehicleString: vehicleString || "(vacío)",
            reason: "No se pudieron extraer datos de vehículos",
          });
          return;
        }

        // Obtener datos de las otras columnas PRESERVANDO el valor original
        const rowData = {};
        originalHeaders.forEach((originalHeader, colIndex) => {
          const cell = row.getCell(colIndex);
          // Usar la función segura para convertir valores de celda
          rowData[colIndex] = this.cellValueToString(cell?.value);
        });

        // Crear un ítem por cada vehículo parseado
        for (const vehicleData of parsedVehicles) {
          const item = new CatalogItem({
            marca: vehicleData.marca,
            vehiculo: vehicleData.vehiculo,
            desde: vehicleData.desde,
            hasta: vehicleData.hasta,
            pieza: rowData[headerMap.get("pieza")] || "",
            lineaFabricante: rowData[headerMap.get("linea fabricante")] || "",
            codeMaster: rowData[headerMap.get("code master")] || "",
            pais: rowData[headerMap.get("pais")] || "",
            additionalData: this.getAdditionalData(
              rowData,
              headerMap,
              originalHeaders,
              vehicleColumnIndex
            ),
            rowNumber,
            sheetName: worksheet.name,
            fileName,
            vehicleColumnIndex: vehicleColumnIndex, // Guardar índice de columna de vehículos
          });

          results.push(item);
        }

        processedRows++;
      } catch (error) {
        console.error(`Error procesando fila ${rowNumber}:`, error.message);
        errorRows++;
      }
    });

    return {
      data: results,
      stats: {
        totalDataRows,
        processedRows,
        errorRows,
      },
      originalHeaders,
      vehicleColumnIndex: vehicleColumnIndex,
      errorDetails, // Detalles de errores para mostrar al usuario
    };
  }

  /**
   * Extrae datos adicionales de la fila (columnas no estándar)
   * Preserva los headers originales y excluye la columna de vehículos
   */
  static getAdditionalData(
    rowData,
    headerMap,
    originalHeaders,
    vehicleColumnIndex
  ) {
    const standardColumnKeys = [
      "linea fabricante",
      "pieza",
      "car catalogue",
      "vehiculo master",
      "code master",
      "pais",
      "marca",
      "vehiculo",
      "desde",
      "hasta",
    ];

    const additionalData = {};

    // Iterar sobre los headers originales
    originalHeaders.forEach((originalHeader, colIndex) => {
      // Normalizar para comparar
      const normalizedHeader = this.normalize(originalHeader);

      // Excluir columnas estándar y la columna de vehículos
      if (
        !standardColumnKeys.includes(normalizedHeader) &&
        colIndex !== vehicleColumnIndex
      ) {
        // Usar el header original (con mayúsculas/minúsculas preservadas) como clave
        additionalData[originalHeader] = rowData[colIndex] || "";
      }
    });

    return additionalData;
  }

  /**
   * Procesa un archivo Excel con configuración específica de hoja y columna
   * @param {string} filePath - Ruta del archivo
   * @param {string} sheetName - Nombre de la hoja a procesar
   * @param {number} vehicleColumnIndex - Índice de columna VEHICULO MASTER (1-based, REQUERIDO)
   */
  static async parseFile(filePath, sheetName, vehicleColumnIndex) {
    const fileName = filePath.split(/[\\/]/).pop();
    const catalogFile = new CatalogFile(fileName, filePath);

    if (!sheetName || !vehicleColumnIndex) {
      throw new Error(
        "Se requiere nombre de hoja y columna de vehículos para procesar el archivo"
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Buscar la hoja específica
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Hoja "${sheetName}" no encontrada en el archivo`);
    }

    console.log(
      `Procesando hoja: ${worksheet.name} (Columna: ${vehicleColumnIndex})`
    );

    const result = this.processWorksheet(
      worksheet,
      fileName,
      vehicleColumnIndex
    );

    catalogFile.addItems(result.data);

    // Agregar detalles de errores
    if (result.errorDetails && result.errorDetails.length > 0) {
      catalogFile.errorDetails.push(...result.errorDetails);
    }

    catalogFile.sheets.push({
      name: worksheet.name,
      items: result.data.length,
      stats: result.stats,
      originalHeaders: result.originalHeaders,
      vehicleColumnIndex: result.vehicleColumnIndex,
      errorDetails: result.errorDetails,
    });

    // Guardar headers originales en el archivo
    catalogFile.originalHeaders = result.originalHeaders;
    catalogFile.vehicleColumnIndex = result.vehicleColumnIndex;

    catalogFile.updateStats({
      totalRows: result.stats.totalDataRows,
      processedRows: result.stats.processedRows,
      errorRows: result.stats.errorRows,
      totalItems: catalogFile.items.length,
    });

    return catalogFile;
  }

  /**
   * Procesa múltiples archivos
   */
  static async parseFiles(filePaths) {
    const results = [];

    for (const filePath of filePaths) {
      try {
        console.log(`\nProcesando archivo: ${filePath}`);
        const catalogFile = await this.parseFile(filePath);
        results.push(catalogFile);
      } catch (error) {
        console.error(`Error procesando ${filePath}:`, error);
        results.push({
          fileName: filePath.split(/[\\/]/).pop(),
          error: error.message,
          items: [],
        });
      }
    }

    return results;
  }

  /**
   * Valida una columna específica de una hoja para determinar si contiene datos de vehículos válidos
   * @param {string} filePath - Ruta del archivo
   * @param {string} sheetName - Nombre de la hoja a validar
   * @param {number} columnIndex - Índice de la columna a validar (1-based)
   * @returns {Object} Resultado de validación con porcentaje de éxito
   */
  static async validateColumn(filePath, sheetName, columnIndex) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        return {
          success: false,
          isValid: false,
          error: `Hoja "${sheetName}" no encontrada`,
        };
      }

      // Contar filas con datos
      let rowCount = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) rowCount++;
      });

      if (rowCount === 0) {
        return {
          success: true,
          isValid: false,
          parseableRows: 0,
          sampleRows: 0,
          successRate: 0,
          message: "La hoja no contiene datos",
        };
      }

      // Tomar muestras de la columna seleccionada
      let parseableRows = 0;
      let sampleRows = 0;
      const maxSamples = Math.min(10, rowCount); // Revisar máximo 10 filas

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Saltar header
        if (sampleRows >= maxSamples) return;

        sampleRows++;
        const vehicleString = this.cellValueToString(
          row.getCell(columnIndex)?.value
        );
        const parsed = this.parseVehicleString(vehicleString);

        if (parsed.length > 0) {
          parseableRows++;
        }
      });

      const successRate =
        sampleRows > 0 ? (parseableRows / sampleRows) * 100 : 0;
      const isValid = successRate >= 50; // Al menos 50% debe ser parseable

      return {
        success: true,
        isValid,
        parseableRows,
        sampleRows,
        successRate: Math.round(successRate),
        message: isValid
          ? `✓ Columna válida: ${parseableRows} de ${sampleRows} muestras son parseables (${Math.round(
              successRate
            )}%)`
          : `✗ Columna inválida: Solo ${parseableRows} de ${sampleRows} muestras son parseables (${Math.round(
              successRate
            )}%)`,
      };
    } catch (error) {
      return {
        success: false,
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Valida un archivo Excel y retorna información sobre sus hojas
   * Ya no valida contenido, solo retorna estructura (hojas y columnas)
   * @param {string} filePath - Ruta del archivo
   * @returns {Object} Información de validación del archivo
   */
  static async validateFile(filePath) {
    const fileName = filePath.split(/[\\/]/).pop();

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const sheets = [];

      // Analizar cada hoja
      for (const worksheet of workbook.worksheets) {
        const headerRow = worksheet.getRow(1);
        const { headerMap, originalHeaders } = this.getHeaderMap(headerRow);

        // Buscar columna de vehículos automáticamente
        const hasVehicleColumn =
          headerMap.has("car catalogue") || headerMap.has("vehiculo master");
        let vehicleColIndex = null;
        let detectedColumnName = null;

        if (hasVehicleColumn) {
          if (headerMap.has("car catalogue")) {
            vehicleColIndex = headerMap.get("car catalogue");
            detectedColumnName = "CAR CATALOGUE";
          } else {
            vehicleColIndex = headerMap.get("vehiculo master");
            detectedColumnName = "VEHICULO MASTER";
          }
        }

        // Contar filas con datos
        let rowCount = 0;
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) rowCount++;
        });

        sheets.push({
          name: worksheet.name,
          hasData: rowCount > 0,
          rowCount,
          columns: Array.from(originalHeaders.values()),
          detectedVehicleColumn: vehicleColIndex,
          detectedColumnName,
          needsManualSelection: !vehicleColIndex && rowCount > 0,
        });
      }

      return {
        success: true,
        fileName,
        filePath,
        sheets,
        totalSheets: sheets.length,
      };
    } catch (error) {
      return {
        success: false,
        fileName,
        filePath,
        error: error.message,
      };
    }
  }

  /**
   * Valida múltiples archivos
   * @param {Array<string>} filePaths - Array de rutas de archivos
   * @returns {Array<Object>} Array con información de validación de cada archivo
   */
  static async validateFiles(filePaths) {
    const results = [];

    for (const filePath of filePaths) {
      const validation = await this.validateFile(filePath);
      results.push(validation);
    }

    return results;
  }
}

module.exports = CatalogParser;
