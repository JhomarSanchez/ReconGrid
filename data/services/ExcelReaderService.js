const ExcelJS = require("exceljs");
const ExcelFile = require("../../domain/entities/ExcelFile");
const ExcelRow = require("../../domain/entities/ExcelRow");
const ExcelColumn = require("../../domain/entities/ExcelColumn");

class ExcelReaderService {
  async loadFile(filePath) {
    try {
      if (!filePath || typeof filePath !== "string") {
        throw new Error(`Ruta de archivo inválida: ${filePath}`);
      }

      console.log("Cargando archivo:", filePath);

      const workbook = new ExcelJS.Workbook();

      // Leer archivo con opciones optimizadas para archivos grandes
      await workbook.xlsx.readFile(filePath);

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
    const endRow = Math.min(
      startRow + maxRows - 1,
      worksheet.rowCount,
      startRow + 10
    );
    const maxCols = Math.min(worksheet.columnCount, 50);

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

  getAllRowsFromColumns(excelFile, columns) {
    const worksheet = excelFile.getWorksheet();
    if (!worksheet) {
      throw new Error("No se ha seleccionado una hoja de trabajo");
    }

    const rows = [];
    const startRow = excelFile.headerRow + 1;
    const maxCols = Math.min(worksheet.columnCount, 200);

    console.log(
      `Procesando desde fila ${startRow} hasta ${worksheet.rowCount}`
    );

    try {
      // Procesar en lotes para evitar problemas de memoria
      const batchSize = 100;

      for (
        let batchStart = startRow;
        batchStart <= worksheet.rowCount;
        batchStart += batchSize
      ) {
        const batchEnd = Math.min(
          batchStart + batchSize - 1,
          worksheet.rowCount
        );

        for (let rowNumber = batchStart; rowNumber <= batchEnd; rowNumber++) {
          try {
            const row = worksheet.getRow(rowNumber);
            const cells = new Map();

            for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
              const cell = row.getCell(colNumber);
              const value = this.getCellValue(cell);
              if (value !== null) {
                cells.set(colNumber, value);
              }
            }

            if (this.isRowNotEmpty(cells)) {
              rows.push(new ExcelRow(rowNumber, cells));
            }
          } catch (rowError) {
            console.warn(`Error en fila ${rowNumber}:`, rowError.message);
            // Continuar con la siguiente fila
          }
        }

        // Permitir que el event loop respire entre lotes
        if (batchStart % 1000 === 0) {
          console.log(`Procesadas ${batchStart - startRow} filas...`);
        }
      }
    } catch (error) {
      console.error("Error en getAllRowsFromColumns:", error);
      throw new Error(`Error al procesar filas: ${error.message}`);
    }

    console.log(`Total de filas procesadas: ${rows.length}`);
    return rows;
  }

  getCellValue(cell) {
    try {
      if (!cell || cell.value === null || cell.value === undefined) {
        return null;
      }

      // Manejar diferentes tipos de valores
      if (typeof cell.value === "object") {
        // Fórmulas
        if (cell.value.formula) {
          return cell.value.result !== undefined ? cell.value.result : null;
        }
        // Texto simple
        if (cell.value.text) {
          return String(cell.value.text).substring(0, 500);
        }
        // Rich text
        if (cell.value.richText && Array.isArray(cell.value.richText)) {
          const text = cell.value.richText.map((rt) => rt.text || "").join("");
          return text.substring(0, 500);
        }
        // Fechas
        if (cell.value instanceof Date) {
          return cell.value.toISOString();
        }
        // Otros objetos - ignorar
        return null;
      }

      // Valores primitivos
      const strValue = String(cell.value);

      // Limitar longitud para evitar problemas de memoria
      if (strValue.length > 500) {
        return strValue.substring(0, 500);
      }

      return cell.value;
    } catch (error) {
      console.warn("Error al leer celda:", error.message);
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
      if (strValue.length > 100) {
        return strValue.substring(0, 100) + "...";
      }

      if (strValue.includes("[object Object]")) {
        return "[Fórmula/Dato inválido]";
      }

      return strValue;
    } catch (error) {
      return "[Error]";
    }
  }

  isRowNotEmpty(cells) {
    if (cells.size === 0) return false;

    for (const [, value] of cells) {
      if (value !== null && value !== undefined) {
        const str = String(value).trim();
        if (str !== "" && str !== "0") {
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
}

module.exports = ExcelReaderService;
