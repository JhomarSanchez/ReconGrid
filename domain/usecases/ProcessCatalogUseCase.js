const CatalogParser = require("../../infrastructure/parsers/CatalogParser");

/**
 * ProcessCatalogUseCase
 * Caso de uso para procesar archivos de catálogos
 */
class ProcessCatalogUseCase {
  /**
   * Ejecuta el procesamiento de catálogos
   * @param {Array<Object>} fileConfigs - Array de configuraciones: [{ filePath, sheetName, columnIndex }, ...]
   * @param {Function} onProgress - Callback para reportar progreso (opcional)
   * @returns {Promise<Object>} - Resultado con array de CatalogFile procesados y estadísticas
   */
  async execute(fileConfigs, onProgress = null) {
    console.log(
      `\n📋 Iniciando procesamiento de ${fileConfigs.length} archivo(s)`
    );

    const results = [];
    let totalFiles = fileConfigs.length;
    let processedFiles = 0;

    for (const config of fileConfigs) {
      try {
        const { filePath, sheetName, columnIndex } = config;

        if (!filePath || !sheetName || !columnIndex) {
          throw new Error(
            "Configuración incompleta: se requiere filePath, sheetName y columnIndex"
          );
        }

        if (onProgress) {
          onProgress({
            phase: "parsing",
            file: filePath.split(/[\\/]/).pop(),
            sheet: sheetName,
            current: processedFiles + 1,
            total: totalFiles,
          });
        }

        const catalogFile = await CatalogParser.parseFile(
          filePath,
          sheetName,
          columnIndex
        );

        results.push(catalogFile);
        processedFiles++;

        console.log(
          `✅ Archivo procesado: ${catalogFile.fileName} (Hoja: ${sheetName})`
        );
        console.log(`   - Total ítems: ${catalogFile.stats.totalItems}`);
        console.log(
          `   - Filas procesadas: ${catalogFile.stats.processedRows}`
        );
        console.log(`   - Errores: ${catalogFile.stats.errorRows}`);
      } catch (error) {
        console.error(`❌ Error procesando ${config.filePath}:`, error);
        results.push({
          fileName: config.filePath.split(/[\\/]/).pop(),
          filePath: config.filePath,
          error: error.message,
          items: [],
          stats: {
            totalRows: 0,
            processedRows: 0,
            errorRows: 0,
            totalItems: 0,
          },
        });
        processedFiles++;
      }
    }

    // Estadísticas finales
    const totalStats = this.calculateTotalStats(results);
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   - Archivos procesados: ${totalStats.filesProcessed}`);
    console.log(`   - Total ítems generados: ${totalStats.totalItems}`);
    console.log(
      `   - Total filas procesadas: ${totalStats.totalProcessedRows}`
    );
    console.log(`   - Total errores: ${totalStats.totalErrorRows}`);

    return {
      success: true,
      results,
      stats: totalStats,
    };
  }

  /**
   * Calcula estadísticas totales de todos los archivos procesados
   */
  calculateTotalStats(results) {
    let totalItems = 0;
    let totalProcessedRows = 0;
    let totalErrorRows = 0;
    let totalDataRows = 0;
    let filesProcessed = 0;
    let filesWithErrors = 0;

    for (const result of results) {
      if (result.error) {
        filesWithErrors++;
      } else {
        filesProcessed++;
        totalItems += result.stats.totalItems || 0;
        totalProcessedRows += result.stats.processedRows || 0;
        totalErrorRows += result.stats.errorRows || 0;
        totalDataRows += result.stats.totalRows || 0;
      }
    }

    return {
      filesProcessed,
      filesWithErrors,
      totalItems,
      totalProcessedRows,
      totalErrorRows,
      totalDataRows,
      successRate:
        totalDataRows > 0
          ? ((totalProcessedRows / totalDataRows) * 100).toFixed(2)
          : 0,
    };
  }
}

module.exports = ProcessCatalogUseCase;
