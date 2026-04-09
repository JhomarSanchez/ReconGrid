class ExcelFile {
  constructor(name, path, workbook) {
    this.name = name;
    this.path = path;
    this.workbook = workbook;
    this.selectedSheet = null;
    this.headerRow = 1;
    this.searchColumns = [];
    this.dataColumns = [];
  }

  setSelectedSheet(sheetName) {
    this.selectedSheet = sheetName;
  }

  setHeaderRow(rowNumber) {
    this.headerRow = rowNumber;
  }

  setSearchColumns(columns) {
    this.searchColumns = columns;
  }

  setDataColumns(columns) {
    this.dataColumns = columns;
  }

  getSheetNames() {
    return this.workbook.worksheets.map((sheet) => sheet.name);
  }

  getWorksheet() {
    return this.workbook.getWorksheet(this.selectedSheet);
  }
}

module.exports = ExcelFile;
