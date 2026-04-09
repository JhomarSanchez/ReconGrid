const ExcelReaderService = require("../services/ExcelReaderService");
const ExcelWriterService = require("../services/ExcelWriterService");

class ExcelRepositoryImpl {
  constructor() {
    this.readerService = new ExcelReaderService();
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
}

module.exports = ExcelRepositoryImpl;
