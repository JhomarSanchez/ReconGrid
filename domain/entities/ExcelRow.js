class ExcelRow {
  constructor(rowNumber, cells) {
    this.rowNumber = rowNumber;
    this.cells = cells; // Map de columnIndex -> valor
  }

  getCellValue(columnIndex) {
    return this.cells.get(columnIndex);
  }

  setCellValue(columnIndex, value) {
    this.cells.set(columnIndex, value);
  }

  getAllCells() {
    return Array.from(this.cells.entries());
  }
}

module.exports = ExcelRow;
