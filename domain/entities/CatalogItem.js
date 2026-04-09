/**
 * CatalogItem Entity
 * Representa un ítem del catálogo de vehículos con sus datos de compatibilidad
 */
class CatalogItem {
  constructor(data = {}) {
    this.marca = data.marca || "";
    this.vehiculo = data.vehiculo || "";
    this.desde = data.desde || "";
    this.hasta = data.hasta || "";
    this.pieza = data.pieza || "";
    this.lineaFabricante = data.lineaFabricante || "";
    this.codeMaster = data.codeMaster || "";
    this.pais = data.pais || "";

    // Metadatos opcionales para desarrollo
    this.metadata = {
      rowNumber: data.rowNumber || null,
      sheetName: data.sheetName || null,
      fileName: data.fileName || null,
    };

    // Datos adicionales (columnas extra del Excel)
    this.additionalData = data.additionalData || {};

    // Índice de la columna VEHICULO MASTER original (para reemplazarla en su posición)
    this.vehicleColumnIndex = data.vehicleColumnIndex || null;
  }

  /**
   * Valida si el ítem tiene los campos mínimos requeridos
   */
  isValid() {
    return (
      this.marca &&
      this.vehiculo &&
      this.pieza &&
      this.lineaFabricante
    );
  }

  /**
   * Convierte el ítem a un objeto plano para exportación
   * OBSOLETO: Usar toPlainObjectWithOrder() para preservar orden original
   */
  toPlainObject() {
    return {
      "LINEA FABRICANTE": this.lineaFabricante,
      MARCA: this.marca,
      VEHICULO: this.vehiculo,
      DESDE: this.desde,
      HASTA: this.hasta,
      PIEZA: this.pieza,
      "CODE MASTER": this.codeMaster,
      PAIS: this.pais,
      ...this.additionalData,
    };
  }

  /**
   * Convierte el ítem a un objeto plano preservando el orden original de columnas
   * y reemplazando VEHICULO MASTER por MARCA, VEHICULO, DESDE, HASTA en su posición
   * @param {Map} originalHeaders - Mapa de índice a nombre original de header
   * @param {number} vehicleColumnIndex - Índice de la columna VEHICULO MASTER original
   */
  toPlainObjectWithOrder(originalHeaders, vehicleColumnIndex) {
    const result = {};

    // Recorrer los headers originales en orden
    originalHeaders.forEach((originalHeader, colIndex) => {
      if (colIndex === vehicleColumnIndex) {
        // Reemplazar la columna VEHICULO MASTER por las nuevas columnas
        result['MARCA'] = this.marca;
        result['VEHICULO'] = this.vehiculo;
        result['DESDE'] = this.desde;
        result['HASTA'] = this.hasta;
      } else {
        // Usar el nombre original del header (preservando mayúsculas/minúsculas)
        // Buscar el valor en additionalData o en las propiedades estándar
        const normalizedHeader = originalHeader.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        // Mapear headers originales a propiedades
        if (normalizedHeader === "linea fabricante") {
          result[originalHeader] = this.lineaFabricante;
        } else if (normalizedHeader === "pieza") {
          result[originalHeader] = this.pieza;
        } else if (normalizedHeader === "code master") {
          result[originalHeader] = this.codeMaster;
        } else if (normalizedHeader === "pais") {
          result[originalHeader] = this.pais;
        } else if (this.additionalData.hasOwnProperty(originalHeader)) {
          // Columnas adicionales (preservando el header original)
          result[originalHeader] = this.additionalData[originalHeader];
        }
      }
    });

    return result;
  }

  /**
   * Crea un CatalogItem desde una fila de Excel procesada
   */
  static fromExcelRow(rowData, metadata = {}) {
    return new CatalogItem({
      marca: rowData.marca || "",
      vehiculo: rowData.vehiculo || "",
      desde: rowData.desde || "",
      hasta: rowData.hasta || "",
      pieza: rowData.pieza || "",
      lineaFabricante: rowData.lineaFabricante || "",
      codeMaster: rowData.codeMaster || "",
      pais: rowData.pais || "",
      additionalData: rowData.additionalData || {},
      rowNumber: metadata.rowNumber,
      sheetName: metadata.sheetName,
      fileName: metadata.fileName,
    });
  }
}

module.exports = CatalogItem;
