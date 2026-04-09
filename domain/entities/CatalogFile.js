/**
 * CatalogFile Entity
 * Representa un archivo de catálogo con sus ítems procesados
 */
class CatalogFile {
  constructor(fileName, filePath) {
    this.fileName = fileName;
    this.filePath = filePath;
    this.items = [];
    this.sheets = [];
    this.stats = {
      totalRows: 0,
      processedRows: 0,
      errorRows: 0,
      totalItems: 0,
    };
    // Headers originales y su orden (se llenarán durante el parsing)
    this.originalHeaders = null;
    this.vehicleColumnIndex = null;
    // Detalles de errores (filas que no se pudieron procesar)
    this.errorDetails = [];
  }

  /**
   * Agrega un ítem al catálogo
   */
  addItem(item) {
    this.items.push(item);
    this.stats.totalItems = this.items.length;
  }

  /**
   * Agrega múltiples ítems al catálogo
   */
  addItems(items) {
    this.items.push(...items);
    this.stats.totalItems = this.items.length;
  }

  /**
   * Actualiza las estadísticas del archivo
   */
  updateStats(stats) {
    this.stats = {
      ...this.stats,
      ...stats,
    };
  }

  /**
   * Obtiene todos los ítems válidos
   */
  getValidItems() {
    return this.items.filter((item) => item.isValid());
  }

  /**
   * Obtiene las estadísticas del archivo
   */
  getStats() {
    return {
      ...this.stats,
      validItems: this.getValidItems().length,
      invalidItems: this.items.length - this.getValidItems().length,
    };
  }

  /**
   * Convierte todos los ítems a objetos planos para exportación
   * OBSOLETO: Usar toPlainObjectsWithOrder() para preservar orden
   */
  toPlainObjects() {
    return this.items.map((item) => item.toPlainObject());
  }

  /**
   * Convierte todos los ítems a objetos planos preservando el orden original
   */
  toPlainObjectsWithOrder() {
    if (!this.originalHeaders || !this.vehicleColumnIndex) {
      // Fallback al método antiguo si no hay información de orden
      return this.toPlainObjects();
    }

    return this.items.map((item) =>
      item.toPlainObjectWithOrder(this.originalHeaders, this.vehicleColumnIndex)
    );
  }
}

module.exports = CatalogFile;
