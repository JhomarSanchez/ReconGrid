const CompareExcelsUseCase = require("../../domain/usecases/CompareExcelsUseCase");
const ExcelRepositoryImpl = require("../../data/repositories/ExcelRepositoryImpl");

class ProcessController {
  constructor() {
    this.repository = new ExcelRepositoryImpl();
    this.compareUseCase = new CompareExcelsUseCase(this.repository);
    this.matchResults = null;
    this.comparisonCompleted = false; // NUEVO: flag para evitar re-procesar
  }

  async compareFiles(sourceFile, targetFile, progressCallback) {
    try {
      // Si ya se procesó, no hacerlo de nuevo
      if (this.comparisonCompleted && this.matchResults) {
        console.log("Usando resultados cacheados de comparación anterior");
        return {
          success: true,
          totalMatches: this.matchResults.length,
          exactMatches: this.matchResults.filter((r) => r.isExact()).length,
          noMatches: this.matchResults.filter((r) => r.matchType === "no_match")
            .length,
        };
      }

      console.log("Iniciando nueva comparación...");
      this.matchResults = await this.compareUseCase.execute(
        sourceFile,
        targetFile,
        progressCallback
      );

      this.comparisonCompleted = true;

      return {
        success: true,
        totalMatches: this.matchResults.length,
        exactMatches: this.matchResults.filter((r) => r.isExact()).length,
        noMatches: this.matchResults.filter((r) => r.matchType === "no_match")
          .length,
      };
    } catch (error) {
      this.comparisonCompleted = false;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async generateResultFile(sourceFile, targetFile, outputPath) {
    try {
      // Usar los resultados ya procesados
      if (!this.matchResults) {
        throw new Error(
          "No hay resultados de comparación. Ejecuta compareFiles primero."
        );
      }

      console.log("Generando archivo de resultados...");
      const result = await this.repository.createResultFile(
        this.matchResults,
        sourceFile,
        targetFile,
        outputPath
      );

      return {
        success: true,
        filePath: result.outputPath,
        creationTime: result.creationTime,
        totalRows: this.matchResults.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getMatchResults() {
    return this.matchResults;
  }

  // NUEVO: método para resetear el caché
  reset() {
    this.matchResults = null;
    this.comparisonCompleted = false;
  }
}

module.exports = ProcessController;
