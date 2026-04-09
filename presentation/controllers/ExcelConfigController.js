const ExcelRepositoryImpl = require("../../data/repositories/ExcelRepositoryImpl");

class ExcelConfigController {
  constructor() {
    this.repository = new ExcelRepositoryImpl();
    this.sourceFile = null;
    this.targetFile = null;
  }

  async loadSourceFile(filePath) {
    try {
      this.sourceFile = await this.repository.loadExcelFile(filePath);
      return {
        success: true,
        sheets: this.sourceFile.getSheetNames(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async loadTargetFile(filePath) {
    try {
      this.targetFile = await this.repository.loadExcelFile(filePath);
      return {
        success: true,
        sheets: this.targetFile.getSheetNames(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  setSourceSheet(sheetName) {
    if (!this.sourceFile) {
      throw new Error("Archivo fuente no cargado");
    }
    this.sourceFile.setSelectedSheet(sheetName);
  }

  setTargetSheet(sheetName) {
    if (!this.targetFile) {
      throw new Error("Archivo objetivo no cargado");
    }
    this.targetFile.setSelectedSheet(sheetName);
  }

  setSourceHeaderRow(rowNumber) {
    if (!this.sourceFile) {
      throw new Error("Archivo fuente no cargado");
    }
    this.sourceFile.setHeaderRow(parseInt(rowNumber));
  }

  setTargetHeaderRow(rowNumber) {
    if (!this.targetFile) {
      throw new Error("Archivo objetivo no cargado");
    }
    this.targetFile.setHeaderRow(parseInt(rowNumber));
  }

  getSourcePreview() {
    if (!this.sourceFile) {
      throw new Error("Archivo fuente no cargado");
    }
    return this.repository.getPreviewData(this.sourceFile, 4);
  }

  getTargetPreview() {
    if (!this.targetFile) {
      throw new Error("Archivo objetivo no cargado");
    }
    return this.repository.getPreviewData(this.targetFile, 4);
  }

  getSourceColumns() {
    if (!this.sourceFile) {
      throw new Error("Archivo fuente no cargado");
    }
    return this.repository.getColumnHeaders(this.sourceFile);
  }

  getTargetColumns() {
    if (!this.targetFile) {
      throw new Error("Archivo objetivo no cargado");
    }
    return this.repository.getColumnHeaders(this.targetFile);
  }

  setSourceSearchColumns(columnLetters) {
    if (!this.sourceFile) {
      throw new Error("Archivo fuente no cargado");
    }
    const columns = this.getSourceColumns().filter((col) =>
      columnLetters.includes(col.letter)
    );
    this.sourceFile.setSearchColumns(columns);
  }

  setTargetSearchColumns(columnLetters) {
    if (!this.targetFile) {
      throw new Error("Archivo objetivo no cargado");
    }
    const columns = this.getTargetColumns().filter((col) =>
      columnLetters.includes(col.letter)
    );
    this.targetFile.setSearchColumns(columns);
  }

  setSourceDataColumns(columnLetters) {
    if (!this.sourceFile) {
      throw new Error("Archivo fuente no cargado");
    }
    const columns = this.getSourceColumns().filter((col) =>
      columnLetters.includes(col.letter)
    );
    this.sourceFile.setDataColumns(columns);
  }

  setTargetDataColumns(columnLetters) {
    if (!this.targetFile) {
      throw new Error("Archivo objetivo no cargado");
    }
    const columns = this.getTargetColumns().filter((col) =>
      columnLetters.includes(col.letter)
    );
    this.targetFile.setDataColumns(columns);
  }

  getSourceFile() {
    return this.sourceFile;
  }

  getTargetFile() {
    return this.targetFile;
  }

  validateSourceConfig() {
    if (!this.sourceFile) {
      return { valid: false, message: "Archivo fuente no cargado" };
    }
    if (!this.sourceFile.selectedSheet) {
      return { valid: false, message: "Hoja no seleccionada" };
    }
    if (this.sourceFile.searchColumns.length === 0) {
      return { valid: false, message: "Columnas de búsqueda no seleccionadas" };
    }
    if (this.sourceFile.dataColumns.length === 0) {
      return { valid: false, message: "Columnas de datos no seleccionadas" };
    }
    return { valid: true };
  }

  validateTargetConfig() {
    if (!this.targetFile) {
      return { valid: false, message: "Archivo objetivo no cargado" };
    }
    if (!this.targetFile.selectedSheet) {
      return { valid: false, message: "Hoja no seleccionada" };
    }
    if (this.targetFile.searchColumns.length === 0) {
      return { valid: false, message: "Columnas de búsqueda no seleccionadas" };
    }
    if (this.targetFile.dataColumns.length === 0) {
      return { valid: false, message: "Columnas de datos no seleccionadas" };
    }
    return { valid: true };
  }
}

module.exports = ExcelConfigController;
