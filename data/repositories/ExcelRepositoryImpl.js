const ExcelStreamReaderService = require("../services/ExcelStreamReaderService");
const ExcelWriterService = require("../services/ExcelWriterService");

class ExcelRepositoryImpl {
  constructor() {
    this.readerService = new ExcelStreamReaderService();
    this.writerService = new ExcelWriterService();
  }

  async loadExcelFile(filePath) {
    return await this.readerService.loadFile(filePath);
  }

  async getPreviewData(excelFile, maxRows = 4) {
    return this.readerService.getPreviewData(excelFile, maxRows);
  }

  async getAllRowsFromColumns(excelFile, columns) {
    return this.readerService.getAllRowsFromColumns(excelFile, columns);
  }

  // NUEVO MÉTODO para obtener TODAS las filas
  async getAllRows(excelFile) {
    return this.readerService.getAllRows(excelFile);
  }

  // NUEVO MÉTODO para obtener filas de una hoja específica por ruta
  async getRowsFromSheet(filePath, sheetName, headerRow) {
    return this.readerService.getRowsFromSheet(filePath, sheetName, headerRow);
  }

  // Obtener nombres de hojas de un archivo
  async getSheetNames(filePath) {
    return this.readerService.getSheetNames(filePath);
  }

  // Obtener vista previa de una hoja
  async getSheetPreview(filePath, sheetName, headerRow, maxRows) {
    const preview = await this.readerService.getSheetPreview(
      filePath,
      sheetName,
      headerRow,
      maxRows
    );

    // Convertir ExcelRow a objetos planos para IPC
    const serializedRows = preview.rows.map((row) => ({
      rowNumber: row.rowNumber,
      cells: Array.from(row.cells.entries()).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {}),
    }));

    return {
      columns: preview.columns,
      rows: serializedRows,
    };
  }

  getColumnHeaders(excelFile) {
    return this.readerService.getColumnHeaders(excelFile);
  }

  getAvailableColumns(excelFile) {
    const worksheet = excelFile.getWorksheet();
    return this.readerService.getColumnRange(worksheet);
  }

  async createResultFile(matchResults, sourceFile, targetFile, outputPath) {
    return await this.writerService.createResultFile(
      matchResults,
      sourceFile,
      targetFile,
      outputPath
    );
  }

  // Crear archivo de resultado para comparación interna
  async createInternalComparisonFile(comparisonResult, outputPath) {
    return await this.writerService.createInternalComparisonFile(
      comparisonResult,
      outputPath
    );
  }
}

module.exports = ExcelRepositoryImpl;
