/**
 * CatalogItem Entity
 * Representa un registro normalizado y sus columnas asociadas.
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

    this.metadata = {
      rowNumber: data.rowNumber || null,
      sheetName: data.sheetName || null,
      fileName: data.fileName || null,
    };

    this.additionalData = data.additionalData || {};
    this.vehicleColumnIndex = data.vehicleColumnIndex || null;
  }

  /**
   * Valida si el registro tiene los campos minimos requeridos.
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
   * Convierte el registro a un objeto plano para exportacion.
   */
  toPlainObject() {
    return {
      "LINEA FABRICANTE": this.lineaFabricante,
      GRUPO: this.marca,
      REGISTRO: this.vehiculo,
      VIGENCIA_DESDE: this.desde,
      VIGENCIA_HASTA: this.hasta,
      PIEZA: this.pieza,
      "CODE MASTER": this.codeMaster,
      PAIS: this.pais,
      ...this.additionalData,
    };
  }

  /**
   * Convierte el registro a un objeto plano preservando el orden original.
   * @param {Map} originalHeaders
   * @param {number} vehicleColumnIndex
   */
  toPlainObjectWithOrder(originalHeaders, vehicleColumnIndex) {
    const result = {};

    originalHeaders.forEach((originalHeader, colIndex) => {
      if (colIndex === vehicleColumnIndex) {
        result["GRUPO"] = this.marca;
        result["REGISTRO"] = this.vehiculo;
        result["VIGENCIA_DESDE"] = this.desde;
        result["VIGENCIA_HASTA"] = this.hasta;
      } else {
        const normalizedHeader = originalHeader.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (normalizedHeader === "linea fabricante") {
          result[originalHeader] = this.lineaFabricante;
        } else if (normalizedHeader === "pieza") {
          result[originalHeader] = this.pieza;
        } else if (normalizedHeader === "code master") {
          result[originalHeader] = this.codeMaster;
        } else if (normalizedHeader === "pais") {
          result[originalHeader] = this.pais;
        } else if (this.additionalData.hasOwnProperty(originalHeader)) {
          result[originalHeader] = this.additionalData[originalHeader];
        }
      }
    });

    return result;
  }

  /**
   * Crea un CatalogItem desde una fila procesada.
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
