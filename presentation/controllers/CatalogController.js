const ProcessCatalogUseCase = require("../../domain/usecases/ProcessCatalogUseCase");

/**
 * CatalogController
 * Controlador para manejar operaciones de normalizacion.
 */
class CatalogController {
  constructor() {
    this.processCatalogUseCase = new ProcessCatalogUseCase();
    this.catalogResults = null;
    this.columnSelections = new Map();
  }

  /**
   * Procesa archivos con configuracion especifica.
   * @param {Array<Object>} fileConfigs
   * @param {Function} onProgress
   */
  async processCatalogs(fileConfigs, onProgress = null) {
    try {
      const result = await this.processCatalogUseCase.execute(
        fileConfigs,
        onProgress
      );

      this.catalogResults = result;

      return {
        success: true,
        stats: result.stats,
        results: result.results,
      };
    } catch (error) {
      console.error("Error en CatalogController:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene los resultados procesados.
   */
  getCatalogResults() {
    return this.catalogResults;
  }

  /**
   * Obtiene todos los registros generados de todos los archivos.
   */
  getAllItems() {
    if (!this.catalogResults || !this.catalogResults.results) {
      return [];
    }

    const allItems = [];

    for (const catalogFile of this.catalogResults.results) {
      if (catalogFile.items) {
        allItems.push(...catalogFile.items);
      }
    }

    return allItems;
  }

  /**
   * Exporta los resultados a objetos planos para Excel.
   */
  exportToPlainObjects() {
    const allItems = this.getAllItems();
    return allItems.map((item) => item.toPlainObject());
  }

  /**
   * Obtiene todos los detalles de errores.
   */
  getAllErrorDetails() {
    if (!this.catalogResults || !this.catalogResults.results) {
      return [];
    }

    const allErrors = [];

    for (const catalogFile of this.catalogResults.results) {
      if (catalogFile.errorDetails && catalogFile.errorDetails.length > 0) {
        const errorsWithFile = catalogFile.errorDetails.map((error) => ({
          ...error,
          fileName: catalogFile.fileName,
        }));
        allErrors.push(...errorsWithFile);
      }
    }

    return allErrors;
  }

  /**
   * Resetea el controlador.
   */
  reset() {
    this.catalogResults = null;
    this.columnSelections.clear();
  }
}

module.exports = CatalogController;
