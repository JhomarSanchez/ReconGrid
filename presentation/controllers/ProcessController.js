const CompareExcelsUseCase = require("../../domain/usecases/CompareExcelsUseCase");
const ExcelRepositoryImpl = require("../../data/repositories/ExcelRepositoryImpl");
const { formatUserError } = require("../utils/formatUserError");

class ProcessController {
  constructor() {
    this.repository = new ExcelRepositoryImpl();
    this.compareUseCase = new CompareExcelsUseCase(this.repository);
    this.matchResults = null;
    this.comparisonCompleted = false;
  }

  async compareFiles(sourceFile, targetFile, progressCallback) {
    try {
      if (this.comparisonCompleted && this.matchResults) {
        console.log("Usando resultados cacheados de comparacion anterior");
        return {
          success: true,
          totalMatches: this.matchResults.length,
          exactMatches: this.matchResults.filter((result) => result.isExact())
            .length,
          noMatches: this.matchResults.filter(
            (result) => result.matchType === "no_match"
          ).length,
        };
      }

      console.log("Iniciando nueva comparacion...");
      this.matchResults = await this.compareUseCase.execute(
        sourceFile,
        targetFile,
        progressCallback
      );
      this.comparisonCompleted = true;

      return {
        success: true,
        totalMatches: this.matchResults.length,
        exactMatches: this.matchResults.filter((result) => result.isExact())
          .length,
        noMatches: this.matchResults.filter(
          (result) => result.matchType === "no_match"
        ).length,
      };
    } catch (error) {
      this.matchResults = null;
      this.comparisonCompleted = false;
      return {
        success: false,
        error: formatUserError(
          error,
          "No se pudo completar la comparacion entre archivos."
        ),
      };
    }
  }

  async generateResultFile(sourceFile, targetFile, outputPath) {
    try {
      if (!this.matchResults) {
        throw new Error(
          "No hay resultados de comparacion. Ejecuta compareFiles primero."
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
        error: formatUserError(
          error,
          "No se pudo generar el archivo de resultados."
        ),
      };
    }
  }

  getMatchResults() {
    return this.matchResults;
  }

  reset() {
    this.matchResults = null;
    this.comparisonCompleted = false;
  }
}

module.exports = ProcessController;
