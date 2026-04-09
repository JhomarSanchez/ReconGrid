const ProcessCatalogUseCase = require("../../domain/usecases/ProcessCatalogUseCase");

/**
 * CatalogController
 * Controlador para manejar operaciones de catalogación
 */
class CatalogController {
  constructor() {
    this.processCatalogUseCase = new ProcessCatalogUseCase();
    this.catalogResults = null;
    this.columnSelections = new Map();
  }

  /**
   * Procesa archivos de catálogo con configuración específica
   * @param {Array<Object>} fileConfigs - Array de configuraciones: [{ filePath, sheetName, columnIndex }, ...]
   * @param {Function} onProgress - Callback para reportar progreso
   */
  async processCatalogs(fileConfigs, onProgress = null) {
    try {
      const result = await this.processCatalogUseCase.execute(
        fileConfigs,
        onProgress
      );

      // Guardar resultados en memoria para posterior exportación
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
   * Obtiene los resultados procesados
   */
  getCatalogResults() {
    return this.catalogResults;
  }

  /**
   * Obtiene todos los ítems de catálogo de todos los archivos
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
   * Exporta los resultados a objetos planos para Excel
   */
  exportToPlainObjects() {
    const allItems = this.getAllItems();
    return allItems.map((item) => item.toPlainObject());
  }

  /**
   * Obtiene todos los detalles de errores de todos los archivos
   */
  getAllErrorDetails() {
    if (!this.catalogResults || !this.catalogResults.results) {
      return [];
    }

    const allErrors = [];

    for (const catalogFile of this.catalogResults.results) {
      if (catalogFile.errorDetails && catalogFile.errorDetails.length > 0) {
        // Agregar el nombre del archivo a cada error
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
   * Resetea el controlador
   */
  reset() {
    this.catalogResults = null;
    this.columnSelections.clear();
  }
}

module.exports = CatalogController;
