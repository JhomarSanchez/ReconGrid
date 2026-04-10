/**
 * CatalogFile Entity
 * Representa un archivo procesado con sus registros generados.
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
    this.originalHeaders = null;
    this.vehicleColumnIndex = null;
    this.errorDetails = [];
  }

  /**
   * Agrega un registro.
   */
  addItem(item) {
    this.items.push(item);
    this.stats.totalItems = this.items.length;
  }

  /**
   * Agrega varios registros.
   */
  addItems(items) {
    this.items.push(...items);
    this.stats.totalItems = this.items.length;
  }

  /**
   * Actualiza las estadisticas del archivo.
   */
  updateStats(stats) {
    this.stats = {
      ...this.stats,
      ...stats,
    };
  }

  /**
   * Obtiene todos los registros validos.
   */
  getValidItems() {
    return this.items.filter((item) => item.isValid());
  }

  /**
   * Obtiene las estadisticas del archivo.
   */
  getStats() {
    return {
      ...this.stats,
      validItems: this.getValidItems().length,
      invalidItems: this.items.length - this.getValidItems().length,
    };
  }

  /**
   * Convierte todos los registros a objetos planos para exportacion.
   */
  toPlainObjects() {
    return this.items.map((item) => item.toPlainObject());
  }

  /**
   * Convierte todos los registros a objetos planos preservando el orden original.
   */
  toPlainObjectsWithOrder() {
    if (!this.originalHeaders || !this.vehicleColumnIndex) {
      return this.toPlainObjects();
    }

    return this.items.map((item) =>
      item.toPlainObjectWithOrder(this.originalHeaders, this.vehicleColumnIndex)
    );
  }
}

module.exports = CatalogFile;
