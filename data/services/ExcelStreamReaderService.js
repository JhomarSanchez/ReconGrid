const ExcelJS = require("exceljs");
const ExcelFile = require("../../domain/entities/ExcelFile");
const ExcelRow = require("../../domain/entities/ExcelRow");
const ExcelColumn = require("../../domain/entities/ExcelColumn");
const fs = require("fs");

class ExcelStreamReaderService {
  async loadFile(filePath) {
    try {
      if (!filePath || typeof filePath !== "string") {
        throw new Error(`Ruta de archivo inválida: ${filePath}`);
      }

      console.log("Cargando archivo con streaming:", filePath);

      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error("El archivo no existe");
      }

      // Obtener tamaño del archivo
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      console.log(`Tamaño del archivo: ${fileSizeInMB.toFixed(2)} MB`);

      // Crear workbook con opciones para archivos grandes
      const workbook = new ExcelJS.Workbook();

      // Configurar opciones para reducir uso de memoria
      const options = {
        sharedStrings: "cache", // Cachear strings compartidos
        hyperlinks: "cache", // Cachear hiperlinks
        styles: "cache", // Cachear estilos
        worksheets: "emit", // Emitir worksheets para procesamiento streaming
      };

      // Si el archivo es menor a 15MB, usar método normal
      if (fileSizeInMB < 15) {
        console.log("Usando método de carga estándar");
        await workbook.xlsx.readFile(filePath);
      } else if (fileSizeInMB < 50) {
        // Para archivos medianos, usar streaming con buffer limitado
        console.log("Usando método de carga por streaming (buffer limitado)");
        const stream = fs.createReadStream(filePath, {
          highWaterMark: 64 * 1024, // Leer en chunks de 64KB
        });
        await workbook.xlsx.read(stream);
      } else {
        // Para archivos muy grandes (>50MB), usar workbook streaming
        console.log(
          "Usando método de carga por streaming avanzado (solo lectura)"
        );
        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
          filePath,
          {
            sharedStrings: "cache",
            hyperlinks: "ignore",
            styles: "cache",
            entries: "emit",
          }
        );

        // Recolectar información de las hojas
        const worksheets = [];

        for await (const worksheetReader of workbookReader) {
          console.log(`Procesando hoja: ${worksheetReader.name}`);

          // Leer solo metadata sin cargar todas las filas
          const worksheet = workbook.addWorksheet(worksheetReader.name);
          worksheets.push(worksheet);

          // Procesar solo las primeras filas para preview
          let rowCount = 0;
          const maxPreviewRows = 100;

          for await (const row of worksheetReader) {
            if (rowCount < maxPreviewRows) {
              worksheet.addRow(row.values);
            }
            rowCount++;
          }

          console.log(
            `Hoja ${worksheetReader.name}: ${rowCount} filas (${maxPreviewRows} cargadas en memoria)`
          );
          worksheet._totalRowCount = rowCount; // Guardar el conteo total
        }
      }

      const fileName = filePath.split(/[/\\]/).pop();
      const excelFile = new ExcelFile(fileName, filePath, workbook);

      // Seleccionar la primera hoja por defecto
      if (workbook.worksheets.length > 0) {
        excelFile.setSelectedSheet(workbook.worksheets[0].name);
      }

      console.log(
        "Archivo cargado:",
        fileName,
        "- Hojas:",
        workbook.worksheets.length
      );
      return excelFile;
    } catch (error) {
      console.error("Error detallado al cargar archivo:", error);

      // Mensajes de error más específicos
      if (
        error.message.includes("Invalid string length") ||
        error.message.includes("Cannot create a string longer")
      ) {
        throw new Error(
          "El archivo es demasiado grande para cargar completamente en memoria. " +
            "Recomendaciones:\n" +
            "1. Divide el archivo en partes más pequeñas (< 30 MB cada una)\n" +
            "2. Elimina columnas innecesarias antes de procesarlo\n" +
            "3. Reduce el número de filas procesando por lotes"
        );
      }

      if (error.message.includes("ENOENT")) {
        throw new Error("No se encontró el archivo seleccionado");
      }

      if (error.message.includes("ENOMEM")) {
        throw new Error(
          "Memoria insuficiente para cargar el archivo. Cierra otras aplicaciones e intenta de nuevo."
        );
      }

      throw new Error(`Error al cargar el archivo: ${error.message}`);
    }
  }

  getPreviewData(excelFile, maxRows = 4) {
    const worksheet = excelFile.getWorksheet();
    if (!worksheet) {
      throw new Error("No se ha seleccionado una hoja de trabajo");
    }

    const previewData = [];
    const startRow = 1;
    const endRow = Math.min(startRow + maxRows - 1, worksheet.rowCount, 20);
    const maxCols = Math.min(worksheet.columnCount, 30);

    try {
      for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};

        for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
          const cell = row.getCell(colNumber);
          const column = ExcelColumn.fromIndex(colNumber);
          rowData[column.letter] = this.getCellDisplayValue(cell);
        }

        previewData.push({
          rowNumber,
          data: rowData,
        });
      }
    } catch (error) {
      console.error("Error en getPreviewData:", error);
      throw new Error(`Error al obtener vista previa: ${error.message}`);
    }

    return previewData;
  }

  getColumnHeaders(excelFile) {
    const worksheet = excelFile.getWorksheet();
    if (!worksheet) {
      throw new Error("No se ha seleccionado una hoja de trabajo");
    }

    const headerRow = worksheet.getRow(excelFile.headerRow);
    const headers = [];
    const maxCols = Math.min(worksheet.columnCount, 100);

    try {
      for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
        const cell = headerRow.getCell(colNumber);
        const column = ExcelColumn.fromIndex(colNumber);
        column.header =
          this.getCellDisplayValue(cell) || `Col ${column.letter}`;
        headers.push(column);
      }
    } catch (error) {
      console.error("Error en getColumnHeaders:", error);
      throw new Error(`Error al obtener encabezados: ${error.message}`);
    }

    return headers;
  }

  async processLargeFileWithStreamingAllRows(filePath, startRow, maxCols) {
    const rows = [];
    let processedCount = 0;

    try {
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        sharedStrings: "cache",
        hyperlinks: "ignore",
        styles: "cache",
      });

      for await (const worksheetReader of workbookReader) {
        console.log(`Procesando hoja con streaming: ${worksheetReader.name}`);

        for await (const row of worksheetReader) {
          const rowNumber = row.number;

          if (rowNumber < startRow) continue;

          try {
            const cells = new Map();

            // Procesar todas las columnas
            for (
              let colNumber = 1;
              colNumber <= maxCols && colNumber <= row.values.length;
              colNumber++
            ) {
              const value = this.normalizeStreamValue(row.values[colNumber]);
              cells.set(colNumber, value); // Incluir nulls
            }

            // Agregar TODAS las filas
            rows.push(new ExcelRow(rowNumber, cells));

            processedCount++;
            if (processedCount % 1000 === 0) {
              console.log(
                `Procesadas ${processedCount} filas con streaming...`
              );
              if (processedCount % 5000 === 0) {
                await new Promise((resolve) => setImmediate(resolve));
              }
            }
          } catch (rowError) {
            console.warn(`Error en fila ${rowNumber}:`, rowError.message);
            rows.push(new ExcelRow(rowNumber, new Map()));
          }
        }

        break; // Solo procesar la primera hoja
      }
    } catch (error) {
      console.error("Error en processLargeFileWithStreamingAllRows:", error);
      throw new Error(`Error al procesar archivo grande: ${error.message}`);
    }

    console.log(`Total de filas procesadas con streaming: ${rows.length}`);
    return rows;
  }

  normalizeStreamValue(value) {
    try {
      if (value === null || value === undefined) {
        return null;
      }

      // Manejar diferentes tipos de valores del stream
      if (typeof value === "object") {
        // Fórmulas - SIEMPRE usar el resultado calculado
        if (value.formula !== undefined) {
          const result = value.result;
          if (result === null || result === undefined) {
            return null;
          }
          // Si el resultado es un objeto Date
          if (result instanceof Date) {
            return result.toISOString().split("T")[0];
          }
          // Si el resultado es otro objeto, intentar convertirlo
          if (typeof result === "object") {
            return result.toString();
          }
          return result;
        }
        // Texto
        if (value.text !== undefined) {
          const text = String(value.text);
          return text.length > 200 ? text.substring(0, 200) : text;
        }
        // Rich text
        if (value.richText && Array.isArray(value.richText)) {
          const text = value.richText.map((rt) => rt.text || "").join("");
          return text.length > 200 ? text.substring(0, 200) : text;
        }
        // Fechas
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        // Otros objetos
        const strValue = value.toString();
        if (strValue === "[object Object]") {
          return null;
        }
        return strValue;
      }

      // Valores primitivos
      const strValue = String(value);
      return strValue.length > 200 ? strValue.substring(0, 200) : value;
    } catch (error) {
      console.warn(`Error normalizando valor de stream:`, error.message);
      return null;
    }
  }

  getCellValue(cell) {
    try {
      if (!cell || cell.value === null || cell.value === undefined) {
        return null;
      }

      // Manejar diferentes tipos de valores
      if (typeof cell.value === "object") {
        // Fórmulas - SIEMPRE usar el resultado calculado
        if (cell.value.formula !== undefined) {
          const result = cell.value.result;
          // Si el resultado es null o undefined, retornar null
          if (result === null || result === undefined) {
            return null;
          }
          // Si el resultado es un objeto Date
          if (result instanceof Date) {
            return result.toISOString().split("T")[0];
          }
          // Si el resultado es otro objeto, intentar convertirlo
          if (typeof result === "object") {
            return result.toString();
          }
          // Retornar el resultado primitivo
          return result;
        }
        // Texto simple
        if (cell.value.text !== undefined) {
          const text = String(cell.value.text);
          return text.length > 200 ? text.substring(0, 200) : text;
        }
        // Rich text
        if (cell.value.richText && Array.isArray(cell.value.richText)) {
          const text = cell.value.richText.map((rt) => rt.text || "").join("");
          return text.length > 200 ? text.substring(0, 200) : text;
        }
        // Fechas
        if (cell.value instanceof Date) {
          return cell.value.toISOString().split("T")[0];
        }
        // Enlaces (hyperlinks)
        if (
          cell.value.hyperlink !== undefined &&
          cell.value.text !== undefined
        ) {
          return cell.value.text;
        }
        // Otros objetos - intentar convertir a string
        const strValue = cell.value.toString();
        if (strValue === "[object Object]") {
          return null;
        }
        return strValue;
      }

      // Valores primitivos
      const strValue = String(cell.value);

      // Limitar longitud
      if (strValue.length > 200) {
        return strValue.substring(0, 200);
      }

      return cell.value;
    } catch (error) {
      console.warn(`Error obteniendo valor de celda:`, error.message);
      return null;
    }
  }

  getCellDisplayValue(cell) {
    try {
      const value = this.getCellValue(cell);

      if (value === null || value === undefined) {
        return "";
      }

      const strValue = String(value);

      // Limitar longitud para display
      if (strValue.length > 50) {
        return strValue.substring(0, 50) + "...";
      }

      if (strValue.includes("[object Object]")) {
        return "[Fórmula]";
      }

      return strValue;
    } catch (error) {
      return "";
    }
  }

  isRowNotEmpty(cells) {
    if (cells.size === 0) return false;

    for (const [, value] of cells) {
      if (value !== null && value !== undefined) {
        const str = String(value).trim();
        if (str !== "") {
          return true;
        }
      }
    }
    return false;
  }

  getColumnRange(worksheet) {
    const maxCol = Math.min(worksheet.columnCount, 200);
    const columns = [];

    for (let i = 1; i <= maxCol; i++) {
      columns.push(ExcelColumn.fromIndex(i));
    }

    return columns;
  }

  async getAllRows(excelFile) {
    const worksheet = excelFile.getWorksheet();
    if (!worksheet) {
      throw new Error("No se ha seleccionado una hoja de trabajo");
    }

    const rows = [];
    const startRow = excelFile.headerRow + 1;
    const maxCols = Math.min(worksheet.columnCount, 200);

    console.log(
      `Leyendo TODAS las filas desde fila ${startRow} hasta ${worksheet.rowCount}`
    );

    try {
      // Verificar si necesitamos reprocesar el archivo con streaming
      const filePath = excelFile.path;
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const fileSizeInMB = stats ? stats.size / (1024 * 1024) : 0;

      // Para archivos muy grandes, procesar con streaming real
      if (fileSizeInMB > 50 && fs.existsSync(filePath)) {
        console.log(
          "Procesando archivo grande con streaming real (todas las filas)..."
        );
        return await this.processAllRowsWithStreaming(
          filePath,
          startRow,
          maxCols
        );
      }

      // Para archivos normales, leer todas las filas
      let processedCount = 0;

      for (
        let rowNumber = startRow;
        rowNumber <= worksheet.rowCount;
        rowNumber++
      ) {
        try {
          const row = worksheet.getRow(rowNumber);
          const cells = new Map();

          // Leer TODAS las columnas
          for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
            const cell = row.getCell(colNumber);
            const value = this.getCellValue(cell);
            cells.set(colNumber, value); // Incluir nulls también
          }

          // Agregar TODAS las filas
          rows.push(new ExcelRow(rowNumber, cells));

          processedCount++;
          if (processedCount % 500 === 0) {
            console.log(`Procesadas ${processedCount} filas...`);
          }
        } catch (rowError) {
          console.warn(`Error en fila ${rowNumber}:`, rowError.message);
          // Agregar fila vacía para mantener la secuencia
          rows.push(new ExcelRow(rowNumber, new Map()));
        }
      }
    } catch (error) {
      console.error("Error en getAllRows:", error);
      throw new Error(`Error al procesar filas: ${error.message}`);
    }

    console.log(`Total de filas leídas: ${rows.length}`);
    return rows;
  }

  /**
   * Lee todas las filas de una hoja específica de un archivo
   * @param {string} filePath - Ruta del archivo Excel
   * @param {string} sheetName - Nombre de la hoja
   * @param {number} headerRow - Fila de encabezados
   * @returns {Promise<Array<ExcelRow>>} Array de filas
   */
  async getRowsFromSheet(filePath, sheetName, headerRow = 1) {
    try {
      console.log(`Leyendo hoja "${sheetName}" desde archivo: ${filePath}`);

      // Verificar tamaño del archivo
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const fileSizeInMB = stats ? stats.size / (1024 * 1024) : 0;
      console.log(`Tamaño del archivo: ${fileSizeInMB.toFixed(2)} MB`);

      // Para archivos grandes, usar streaming
      if (fileSizeInMB > 20) {
        console.log("Usando streaming para leer filas (archivo grande)");
        return await this.getRowsFromSheetWithStreaming(
          filePath,
          sheetName,
          headerRow
        );
      }

      // Para archivos normales, método estándar
      console.log("Usando método estándar para leer filas");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new Error(`La hoja "${sheetName}" no existe en el archivo`);
      }

      const rows = [];
      const startRow = headerRow + 1;
      const maxCols = Math.min(worksheet.columnCount, 200);

      console.log(`Leyendo desde fila ${startRow} hasta ${worksheet.rowCount}`);

      let processedCount = 0;

      for (
        let rowNumber = startRow;
        rowNumber <= worksheet.rowCount;
        rowNumber++
      ) {
        try {
          const row = worksheet.getRow(rowNumber);
          const cells = new Map();

          // Leer todas las columnas
          for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
            const cell = row.getCell(colNumber);
            const value = this.getCellValue(cell);
            cells.set(colNumber, value);
          }

          rows.push(new ExcelRow(rowNumber, cells));

          processedCount++;
          if (processedCount % 500 === 0) {
            console.log(`Procesadas ${processedCount} filas...`);
          }
        } catch (rowError) {
          console.warn(`Error en fila ${rowNumber}:`, rowError.message);
          rows.push(new ExcelRow(rowNumber, new Map()));
        }
      }

      console.log(`Total de filas leídas: ${rows.length}`);
      return rows;
    } catch (error) {
      console.error("Error en getRowsFromSheet:", error);
      throw new Error(`Error al leer hoja "${sheetName}": ${error.message}`);
    }
  }

  /**
   * Lee filas usando streaming para archivos grandes
   */
  async getRowsFromSheetWithStreaming(filePath, sheetName, headerRow) {
    try {
      const rows = [];
      let foundSheet = false;
      let maxCols = 200;

      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        sharedStrings: "cache",
        hyperlinks: "ignore",
        styles: "cache",
      });

      for await (const worksheetReader of workbookReader) {
        if (worksheetReader.name !== sheetName) {
          continue; // Saltar otras hojas
        }

        foundSheet = true;
        console.log(`Procesando hoja con streaming: ${worksheetReader.name}`);

        let rowCount = 0;
        const startRow = headerRow + 1;

        for await (const row of worksheetReader) {
          rowCount++;

          // Saltar filas antes del inicio
          if (rowCount < startRow) continue;

          try {
            const cells = new Map();

            // Procesar todas las columnas
            for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
              const value =
                colNumber < row.values.length
                  ? this.normalizeStreamValue(row.values[colNumber])
                  : null;
              cells.set(colNumber, value);
            }

            rows.push(new ExcelRow(rowCount, cells));

            if (rows.length % 1000 === 0) {
              console.log(`Procesadas ${rows.length} filas con streaming...`);
              // Dar tiempo para garbage collection
              if (global.gc) {
                global.gc();
              }
              await new Promise((resolve) => setImmediate(resolve));
            }
          } catch (rowError) {
            console.warn(`Error en fila ${rowCount}:`, rowError.message);
            rows.push(new ExcelRow(rowCount, new Map()));
          }
        }

        break; // Solo procesar la hoja solicitada
      }

      if (!foundSheet) {
        throw new Error(`La hoja "${sheetName}" no existe`);
      }

      console.log(`Total de filas leídas con streaming: ${rows.length}`);
      return rows;
    } catch (error) {
      console.error("Error en getRowsFromSheetWithStreaming:", error);
      throw error;
    }
  }

  async processAllRowsWithStreaming(filePath, startRow, maxCols) {
    const rows = [];
    let processedCount = 0;

    try {
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        sharedStrings: "cache",
        hyperlinks: "ignore",
        styles: "cache",
      });

      for await (const worksheetReader of workbookReader) {
        console.log(
          `Procesando hoja con streaming (todas las filas): ${worksheetReader.name}`
        );

        for await (const row of worksheetReader) {
          const rowNumber = row.number;

          if (rowNumber < startRow) continue;

          try {
            const cells = new Map();

            // Procesar todas las columnas
            for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
              const value =
                colNumber <= row.values.length
                  ? this.normalizeStreamValue(row.values[colNumber])
                  : null;
              cells.set(colNumber, value);
            }

            // Agregar TODAS las filas
            rows.push(new ExcelRow(rowNumber, cells));

            processedCount++;
            if (processedCount % 1000 === 0) {
              console.log(
                `Procesadas ${processedCount} filas con streaming...`
              );
              if (processedCount % 5000 === 0) {
                await new Promise((resolve) => setImmediate(resolve));
              }
            }
          } catch (rowError) {
            console.warn(`Error en fila ${rowNumber}:`, rowError.message);
            rows.push(new ExcelRow(rowNumber, new Map()));
          }
        }

        break; // Solo procesar la primera hoja
      }
    } catch (error) {
      console.error("Error en processAllRowsWithStreaming:", error);
      throw new Error(`Error al procesar archivo grande: ${error.message}`);
    }

    console.log(`Total de filas procesadas con streaming: ${rows.length}`);
    return rows;
  }

  /**
   * Obtiene los nombres de todas las hojas de un archivo Excel
   * @param {string} filePath - Ruta del archivo Excel
   * @returns {Promise<Array<string>>} Array con los nombres de las hojas
   */
  async getSheetNames(filePath) {
    try {
      console.log("Obteniendo nombres de hojas con streaming:", filePath);

      // Verificar tamaño del archivo
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const fileSizeInMB = stats ? stats.size / (1024 * 1024) : 0;
      console.log(`Tamaño del archivo: ${fileSizeInMB.toFixed(2)} MB`);

      const sheetNames = [];

      // Para archivos grandes, usar streaming
      if (fileSizeInMB > 10) {
        console.log("Usando streaming para leer hojas (archivo grande)");
        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
          filePath,
          {
            sharedStrings: "ignore",
            hyperlinks: "ignore",
            styles: "ignore",
            worksheets: "emit",
          }
        );

        for await (const worksheetReader of workbookReader) {
          sheetNames.push(worksheetReader.name);
          console.log(`Hoja encontrada: ${worksheetReader.name}`);
          // No leer las filas, solo los nombres
        }
      } else {
        // Para archivos pequeños, usar método estándar
        console.log("Usando método estándar para leer hojas");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        sheetNames.push(...workbook.worksheets.map((ws) => ws.name));
      }

      console.log(`Total de hojas encontradas: ${sheetNames.length}`);
      return sheetNames;
    } catch (error) {
      console.error("Error obteniendo nombres de hojas:", error);
      throw new Error(`Error al leer hojas: ${error.message}`);
    }
  }

  /**
   * Obtiene vista previa de una hoja específica
   * @param {string} filePath - Ruta del archivo
   * @param {string} sheetName - Nombre de la hoja
   * @param {number} headerRow - Fila de encabezados
   * @param {number} maxRows - Máximo de filas a obtener
   * @returns {Promise<Object>} Objeto con columnas y filas de preview
   */
  async getSheetPreview(filePath, sheetName, headerRow = 1, maxRows = 5) {
    try {
      console.log(
        `Obteniendo preview de hoja "${sheetName}" (${maxRows} filas)`
      );

      // Verificar tamaño del archivo
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const fileSizeInMB = stats ? stats.size / (1024 * 1024) : 0;

      // Para archivos grandes, usar streaming
      if (fileSizeInMB > 10) {
        console.log("Usando streaming para preview (archivo grande)");
        return await this.getSheetPreviewWithStreaming(
          filePath,
          sheetName,
          headerRow,
          maxRows
        );
      }

      // Para archivos pequeños, usar método estándar
      console.log("Usando método estándar para preview");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new Error(`La hoja "${sheetName}" no existe`);
      }

      // Obtener encabezados
      const headerRowData = worksheet.getRow(headerRow);
      const columns = [];

      for (let i = 1; i <= Math.min(worksheet.columnCount, 200); i++) {
        const cell = headerRowData.getCell(i);
        const value = this.getCellValue(cell);
        columns.push({
          letter: this.indexToColumnLetter(i - 1),
          index: i,
          header: value || `Columna ${this.indexToColumnLetter(i - 1)}`,
        });
      }

      // Obtener filas de preview
      const rows = [];
      const startRow = headerRow + 1;
      const endRow = Math.min(startRow + maxRows - 1, worksheet.rowCount);

      for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const cells = new Map();

        for (let colNum = 1; colNum <= worksheet.columnCount; colNum++) {
          const cell = row.getCell(colNum);
          const value = this.getCellValue(cell);
          cells.set(colNum, value);
        }

        rows.push(new ExcelRow(rowNum, cells));
      }

      return { columns, rows };
    } catch (error) {
      console.error("Error en getSheetPreview:", error);
      throw error;
    }
  }

  /**
   * Obtiene preview usando streaming para archivos grandes
   */
  async getSheetPreviewWithStreaming(filePath, sheetName, headerRow, maxRows) {
    try {
      const columns = [];
      const rows = [];
      let foundSheet = false;
      let headerRowData = null;
      let maxCols = 0;

      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        sharedStrings: "cache",
        hyperlinks: "ignore",
        styles: "ignore",
      });

      for await (const worksheetReader of workbookReader) {
        if (worksheetReader.name !== sheetName) {
          continue; // Saltar otras hojas
        }

        foundSheet = true;
        console.log(`Procesando hoja: ${worksheetReader.name}`);

        let rowCount = 0;
        const startRow = headerRow + 1;
        const endRow = startRow + maxRows - 1;

        for await (const row of worksheetReader) {
          rowCount++;

          // Capturar fila de encabezados
          if (rowCount === headerRow) {
            headerRowData = row.values;
            maxCols = Math.min(headerRowData.length - 1, 200); // -1 porque el índice 0 está vacío
            continue;
          }

          // Capturar filas de preview
          if (rowCount >= startRow && rowCount <= endRow) {
            const cells = new Map();
            for (let colNum = 1; colNum <= maxCols; colNum++) {
              const value =
                colNum < row.values.length
                  ? this.normalizeStreamValue(row.values[colNum])
                  : null;
              cells.set(colNum, value);
            }
            rows.push(new ExcelRow(rowCount, cells));
          }

          // Ya tenemos suficientes filas
          if (rowCount > endRow) {
            break;
          }
        }

        break; // Solo procesar la hoja solicitada
      }

      if (!foundSheet) {
        throw new Error(`La hoja "${sheetName}" no existe`);
      }

      // Construir columnas desde headerRowData
      for (let i = 1; i <= maxCols; i++) {
        const value =
          headerRowData && i < headerRowData.length
            ? this.normalizeStreamValue(headerRowData[i])
            : null;
        columns.push({
          letter: this.indexToColumnLetter(i - 1),
          index: i,
          header: value || `Columna ${this.indexToColumnLetter(i - 1)}`,
        });
      }

      return { columns, rows };
    } catch (error) {
      console.error("Error en getSheetPreviewWithStreaming:", error);
      throw error;
    }
  }

  /**
   * Convierte índice de columna a letra (0=A, 1=B, 25=Z, 26=AA, etc.)
   */
  indexToColumnLetter(index) {
    let letter = "";
    index = index + 1;

    while (index > 0) {
      const remainder = (index - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      index = Math.floor((index - 1) / 26);
    }

    return letter;
  }
}

module.exports = ExcelStreamReaderService;
