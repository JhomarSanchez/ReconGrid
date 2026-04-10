const CompareWithinSheetUseCase = require("../../domain/usecases/CompareWithinSheetUseCase");
const ExcelRepositoryImpl = require("../../data/repositories/ExcelRepositoryImpl");
const { formatUserError } = require("../utils/formatUserError");

class InternalComparisonController {
  constructor() {
    this.repository = new ExcelRepositoryImpl();
    this.useCase = new CompareWithinSheetUseCase(this.repository);
    this.comparisonResult = null;
    this.currentConfig = null;
  }

  async getSheetNames(filePath) {
    try {
      return await this.repository.getSheetNames(filePath);
    } catch (error) {
      console.error("Error obteniendo hojas:", error);
      throw error;
    }
  }

  async getSheetPreview(filePath, sheetName, headerRow = 1) {
    try {
      return await this.repository.getSheetPreview(
        filePath,
        sheetName,
        headerRow,
        5
      );
    } catch (error) {
      console.error("Error obteniendo preview:", error);
      throw error;
    }
  }

  async compareColumns(config, progressCallback) {
    try {
      this.currentConfig = config;
      this.comparisonResult = await this.useCase.execute(
        config,
        progressCallback
      );

      return {
        success: true,
        stats: this.comparisonResult.stats,
      };
    } catch (error) {
      console.error("Error en comparacion:", error);
      return {
        success: false,
        error: formatUserError(
          error,
          "No se pudo completar la comparacion interna."
        ),
      };
    }
  }

  async generateResultFile(outputPath) {
    try {
      if (!this.comparisonResult) {
        throw new Error("No hay resultados para generar archivo");
      }

      const result = await this.repository.createInternalComparisonFile(
        this.comparisonResult,
        outputPath
      );

      return {
        success: true,
        filePath: result.outputPath,
        creationTime: result.creationTime,
        stats: this.comparisonResult.stats,
      };
    } catch (error) {
      console.error("Error generando archivo:", error);
      return {
        success: false,
        error: formatUserError(
          error,
          "No se pudo generar el archivo de comparacion interna."
        ),
      };
    }
  }

  getComparisonResult() {
    return this.comparisonResult;
  }

  reset() {
    this.comparisonResult = null;
    this.currentConfig = null;
    console.log("Controlador de comparacion interna reseteado");
  }
}

module.exports = InternalComparisonController;
