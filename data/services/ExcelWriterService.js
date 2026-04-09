const ExcelJS = require("exceljs");
const ExcelColumn = require("../../domain/entities/ExcelColumn");

class ExcelWriterService {
  async createResultFile(matchResults, sourceFile, targetFile, outputPath) {
    // Iniciar cronómetro
    const startTime = performance.now();

    console.log(
      `Generando archivo resultado con ${matchResults.length} filas...`
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resultado");

    // Configurar encabezados con fondo verde
    const headers = this.buildHeaders(sourceFile, targetFile);
    const headerRow = worksheet.addRow(headers);

    console.log(`Encabezados creados: ${headers.length} columnas`);

    // Estilo de encabezados - fondo verde
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF90EE90" }, // Verde claro
      };
      cell.font = {
        bold: true,
        color: { argb: "FF000000" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    // Agregar TODAS las filas
    let addedRows = 0;
    for (const matchResult of matchResults) {
      // NO filtrar por approved - queremos TODAS las filas del Excel 1
      const rowData = this.buildRowData(matchResult, sourceFile, targetFile);
      worksheet.addRow(rowData);
      addedRows++;

      if (addedRows % 1000 === 0) {
        console.log(`Agregadas ${addedRows} filas al resultado...`);
      }
    }

    console.log(`Total de filas agregadas: ${addedRows}`);

    // Autoajustar columnas
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Guardar archivo
    console.log(`Guardando archivo en: ${outputPath}`);
    await workbook.xlsx.writeFile(outputPath);

    // Calcular tiempo total
    const endTime = performance.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log("Archivo guardado exitosamente");
    console.log(
      `⏱️  Tiempo total de creación del Excel: ${totalTime} segundos`
    );

    return { outputPath, creationTime: totalTime };
  }

  buildHeaders(sourceFile, targetFile) {
    const headers = [];

    // Headers del Excel 1 (columnas de datos seleccionadas por el usuario)
    for (const column of sourceFile.dataColumns) {
      headers.push(column.header || `Columna ${column.letter}`);
    }

    // Headers del Excel 2 (columnas de datos seleccionadas por el usuario)
    for (const column of targetFile.dataColumns) {
      headers.push(column.header || `Columna ${column.letter}`);
    }

    return headers;
  }

  buildRowData(matchResult, sourceFile, targetFile) {
    const rowData = [];

    // SIEMPRE agregar datos del Excel 1 (sourceRow)
    for (const column of sourceFile.dataColumns) {
      const value = matchResult.sourceRow.getCellValue(column.index);
      rowData.push(this.sanitizeValue(value));
    }

    // Agregar datos del Excel 2 (targetRow) si existe coincidencia
    if (matchResult.targetRow) {
      // Hay coincidencia - agregar datos del Excel 2
      for (const column of targetFile.dataColumns) {
        const value = matchResult.targetRow.getCellValue(column.index);
        rowData.push(this.sanitizeValue(value));
      }
    } else {
      // NO hay coincidencia - llenar con espacios vacíos
      for (const column of targetFile.dataColumns) {
        rowData.push("");
      }
    }

    return rowData;
  }

  sanitizeValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    // Si es un objeto Date, convertirlo a string legible
    if (value instanceof Date) {
      return value.toISOString().split("T")[0]; // Formato YYYY-MM-DD
    }

    // Si es un objeto (que no debería llegar aquí porque getCellValue ya los procesa)
    if (typeof value === "object") {
      // Si tiene una propiedad que podemos usar
      if (value.result !== undefined) {
        return this.sanitizeValue(value.result); // Recursivo para procesar el resultado
      }
      if (value.text !== undefined) {
        return value.text;
      }
      // Si no sabemos qué hacer con él, convertirlo a JSON o retornar vacío
      const strValue = JSON.stringify(value);
      if (strValue === "{}" || strValue === "null") {
        return "";
      }
      return strValue;
    }

    const strValue = value.toString();

    // Detectar [Object object]
    if (strValue.includes("[object Object]")) {
      return "";
    }

    return strValue;
  }

  /**
   * Crea un archivo Excel con los resultados de la comparación interna
   * @param {Object} comparisonResult - Resultado de la comparación
   * @param {string} outputPath - Ruta de salida
   * @returns {Promise<Object>} Información del archivo creado
   */
  async createInternalComparisonFile(comparisonResult, outputPath) {
    const startTime = performance.now();

    console.log(
      `Generando archivo de comparación interna con ${comparisonResult.results.length} filas...`
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Comparación");

    const { results, config, columnHeaders, columnOrder } = comparisonResult;

    // Construir encabezados dinámicos usando el orden correcto
    const headers = [];

    // Usar columnOrder si existe, sino usar las keys ordenadas alfabéticamente
    const orderedColumns =
      columnOrder ||
      (results.length > 0 ? Object.keys(results[0].allData).sort() : []);

    console.log(
      `Orden de columnas para el archivo: ${orderedColumns.join(", ")}`
    );

    // Usar los nombres de encabezados reales en lugar de las letras
    for (const letter of orderedColumns) {
      const headerName =
        columnHeaders && columnHeaders[letter]
          ? columnHeaders[letter]
          : `Columna ${letter}`;
      headers.push(headerName);
    }

    // Añadir la columna de resultado
    headers.push(config.resultColumnName || "Concordancia");

    const headerRow = worksheet.addRow(headers);

    // Estilo de encabezados
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" }, // Azul
      };
      cell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" }, // Blanco
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    // Agregar filas de datos
    let addedRows = 0;
    for (const result of results) {
      const rowData = [];

      // Agregar todos los datos originales usando el mismo orden de columnas
      if (result.allData) {
        for (const letter of orderedColumns) {
          const value = result.allData[letter];
          rowData.push(this.sanitizeValue(value));
        }
      }

      // Agregar resultado de comparación
      rowData.push(result.comparison);

      const row = worksheet.addRow(rowData);

      // Aplicar color según el resultado
      const lastCellIndex = rowData.length;
      const comparisonCell = row.getCell(lastCellIndex);

      if (result.comparison === "IGUALES") {
        comparisonCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF90EE90" }, // Verde claro
        };
        comparisonCell.font = { bold: true, color: { argb: "FF006400" } };
      } else {
        comparisonCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" }, // Rojo claro
        };
        comparisonCell.font = { bold: true, color: { argb: "FF9C0006" } };
      }

      addedRows++;
      if (addedRows % 1000 === 0) {
        console.log(`Agregadas ${addedRows} filas...`);
      }
    }

    console.log(`Total de filas agregadas: ${addedRows}`);

    // Autoajustar columnas
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Guardar archivo
    console.log(`Guardando archivo en: ${outputPath}`);
    await workbook.xlsx.writeFile(outputPath);

    const endTime = performance.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log("Archivo guardado exitosamente");
    console.log(`⏱️  Tiempo de creación: ${totalTime} segundos`);

    return { outputPath, creationTime: totalTime };
  }
}

module.exports = ExcelWriterService;
