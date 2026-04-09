const CompareWithinSheetUseCase = require("../../domain/usecases/CompareWithinSheetUseCase");
const ExcelRepositoryImpl = require("../../data/repositories/ExcelRepositoryImpl");

/**
 * Controlador para manejar la comparación de columnas dentro de una misma hoja
 */
class InternalComparisonController {
  constructor() {
    this.repository = new ExcelRepositoryImpl();
    this.useCase = new CompareWithinSheetUseCase(this.repository);
    this.comparisonResult = null;
    this.currentConfig = null;
  }

  /**
   * Obtiene los nombres de las hojas de un archivo
   * @param {string} filePath - Ruta del archivo Excel
   * @returns {Promise<Array<string>>} Array con nombres de hojas
   */
  async getSheetNames(filePath) {
    try {
      return await this.repository.getSheetNames(filePath);
    } catch (error) {
      console.error("Error obteniendo hojas:", error);
      throw error;
    }
  }

  /**
   * Obtiene vista previa de una hoja
   * @param {string} filePath - Ruta del archivo
   * @param {string} sheetName - Nombre de la hoja
   * @param {number} headerRow - Fila de encabezados
   * @returns {Promise<Object>} Vista previa con columnas y filas
   */
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

  /**
   * Ejecuta la comparación entre dos columnas
   * @param {Object} config - Configuración de la comparación
   * @param {Function} progressCallback - Callback para reportar progreso
   * @returns {Promise<Object>} Resultado de la comparación
   */
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
      console.error("Error en comparación:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera el archivo Excel con los resultados
   * @param {string} outputPath - Ruta donde guardar el archivo
   * @returns {Promise<Object>} Información del archivo generado
   */
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
        error: error.message,
      };
    }
  }

  /**
   * Obtiene los resultados de la comparación
   * @returns {Object|null} Resultados de la comparación
   */
  getComparisonResult() {
    return this.comparisonResult;
  }

  /**
   * Resetea el estado del controlador
   */
  reset() {
    this.comparisonResult = null;
    this.currentConfig = null;
    console.log("Controlador de comparación interna reseteado");
  }
}

module.exports = InternalComparisonController;
