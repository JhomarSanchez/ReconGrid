/**
 * Caso de uso para comparar dos columnas dentro de una misma hoja de Excel
 * Identifica si los valores de dos columnas son IGUALES o DIFERENTES
 */
class CompareWithinSheetUseCase {
  constructor(excelRepository) {
    this.excelRepository = excelRepository;
  }

  /**
   * Ejecuta la comparación entre dos columnas de una misma hoja
   * @param {Object} config - Configuración de la comparación
   * @param {string} config.filePath - Ruta del archivo Excel
   * @param {string} config.sheetName - Nombre de la hoja
   * @param {number} config.headerRow - Fila de encabezados
   * @param {string} config.column1 - Letra de la primera columna (ej: "A")
   * @param {string} config.column2 - Letra de la segunda columna (ej: "Z")
   * @param {string} config.resultColumnName - Nombre de la columna de resultado
   * @param {Function} onProgress - Callback para reportar progreso
   * @returns {Promise<Array>} Array de resultados con comparaciones
   */
  async execute(config, onProgress) {
    const {
      filePath,
      sheetName,
      headerRow,
      column1,
      column2,
      resultColumnName = "Concordancia",
    } = config;

    // Obtener los encabezados primero
    const headerData = await this.excelRepository.getSheetPreview(
      filePath,
      sheetName,
      headerRow,
      0 // Solo queremos los encabezados, no filas de datos
    );

    // Crear mapa de letra de columna -> nombre de encabezado
    const columnHeaders = {};
    const columnOrder = []; // Mantener el orden correcto de las columnas

    headerData.columns.forEach((col) => {
      columnHeaders[col.letter] = col.header;
      columnOrder.push(col.letter);
    });

    // Leer todas las filas de la hoja
    const rows = await this.excelRepository.getRowsFromSheet(
      filePath,
      sheetName,
      headerRow
    );

    // Convertir letras de columna a índices
    const col1Index = this.columnLetterToIndex(column1);
    const col2Index = this.columnLetterToIndex(column2);

    const results = [];
    const totalRows = rows.length;
    let processedRows = 0;
    let equalCount = 0;
    let differentCount = 0;

    // Comparar cada fila
    for (const row of rows) {
      const value1 = this.normalizeValue(row.getCellValue(col1Index));
      const value2 = this.normalizeValue(row.getCellValue(col2Index));

      // Determinar si son iguales o diferentes
      const comparison = value1 === value2 ? "IGUALES" : "DIFERENTES";

      if (comparison === "IGUALES") {
        equalCount++;
      } else {
        differentCount++;
      }

      // Crear objeto de resultado con todos los datos de la fila original + comparación
      const result = {
        rowNumber: row.rowNumber,
        column1Value: value1,
        column2Value: value2,
        comparison: comparison,
        allData: this.extractAllRowData(row, columnOrder),
      };

      results.push(result);

      processedRows++;
      if (onProgress) {
        onProgress(processedRows, totalRows);
      }

      // Log cada 1000 filas
      if (processedRows % 1000 === 0) {
        console.log(
          `Procesadas ${processedRows}/${totalRows} filas... (Iguales: ${equalCount}, Diferentes: ${differentCount})`
        );
      }
    }

    return {
      results,
      stats: {
        total: totalRows,
        equal: equalCount,
        different: differentCount,
      },
      config: {
        column1,
        column2,
        resultColumnName,
        sheetName,
      },
      columnHeaders, // Añadir los encabezados al resultado
      columnOrder, // Añadir el orden de las columnas
    };
  }

  /**
   * Normaliza un valor para comparación
   * @param {*} value - Valor a normalizar
   * @returns {string} Valor normalizado
   */
  normalizeValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    // Si es un objeto con fórmula, retornar vacío
    if (typeof value === "object" && value.formula) {
      return "";
    }

    // Convertir a string y eliminar espacios
    return value.toString().trim().toUpperCase();
  }

  /**
   * Extrae todos los datos de una fila usando solo las columnas especificadas
   * @param {ExcelRow} row - Fila de Excel
   * @param {Array<string>} columnOrder - Array con las letras de columna en orden
   * @returns {Object} Objeto con todos los valores de la fila
   */
  extractAllRowData(row, columnOrder) {
    const data = {};

    // Solo extraer las columnas que están en columnOrder
    for (const columnLetter of columnOrder) {
      const columnIndex = this.columnLetterToIndex(columnLetter);
      const value = row.getCellValue(columnIndex);

      // Log para debug - comentar después
      if (row.rowNumber <= 3) {
        console.log(
          `Fila ${row.rowNumber}, Columna ${columnLetter} (index ${columnIndex}):`,
          value,
          typeof value
        );
      }

      data[columnLetter] = value !== null && value !== undefined ? value : "";
    }

    return data;
  }

  /**
   * Convierte letra de columna a índice (A=1, B=2, Z=26, AA=27, etc.)
   * @param {string} letter - Letra de columna
   * @returns {number} Índice de columna (base 1, compatible con ExcelJS)
   */
  columnLetterToIndex(letter) {
    letter = letter.toUpperCase();
    let index = 0;

    for (let i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 64);
    }

    return index; // Retornar índice base 1 (A=1, B=2, etc.)
  }

  /**
   * Convierte índice de columna a letra (1=A, 2=B, 26=Z, 27=AA, etc.)
   * @param {number} index - Índice de columna (base 1, compatible con ExcelJS)
   * @returns {string} Letra de columna
   */
  indexToColumnLetter(index) {
    let letter = "";

    while (index > 0) {
      const remainder = (index - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      index = Math.floor((index - 1) / 26);
    }

    return letter;
  }
}

module.exports = CompareWithinSheetUseCase;
