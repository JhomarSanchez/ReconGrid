const { performance } = require("node:perf_hooks");

const CompareExcelsUseCase = require("../domain/usecases/CompareExcelsUseCase");
const ExcelRow = require("../domain/entities/ExcelRow");

function createRow(rowNumber, value) {
  return new ExcelRow(rowNumber, new Map([[1, value], [2, `fila-${rowNumber}`]]));
}

function createFile(kind) {
  return {
    kind,
    searchColumns: [{ index: 1 }],
  };
}

function createCode(index) {
  return `SKU-${String(index).padStart(6, "0")}`;
}

function mutateCode(code, index) {
  switch (index % 4) {
    case 0:
      return code;
    case 1:
      return code.replace(/-/g, " ");
    case 2:
      return code.replace(/-/g, "");
    default:
      return code.replace(/-/g, "/");
  }
}

class FakeRepository {
  constructor(sourceRows, targetRows) {
    this.sourceRows = sourceRows;
    this.targetRows = targetRows;
  }

  async getAllRows(file) {
    return file.kind === "source" ? this.sourceRows : this.targetRows;
  }
}

async function main() {
  const totalRows = 20000;
  const sourceRows = [];
  const targetRows = [];

  for (let index = 1; index <= totalRows; index++) {
    const code = createCode(index);
    sourceRows.push(createRow(index + 1, code));
    targetRows.push(createRow(index + 1, mutateCode(code, index)));
  }

  const repository = new FakeRepository(sourceRows, targetRows);
  const useCase = new CompareExcelsUseCase(repository);

  const startedAt = performance.now();
  const results = await useCase.execute(createFile("source"), createFile("target"));
  const finishedAt = performance.now();

  const exactMatches = results.filter((result) => result.isExact()).length;
  const noMatches = results.filter(
    (result) => result.matchType === "no_match"
  ).length;

  console.log("Benchmark del motor de comparacion");
  console.log(`Filas origen: ${sourceRows.length}`);
  console.log(`Filas destino: ${targetRows.length}`);
  console.log(`Coincidencias exactas: ${exactMatches}`);
  console.log(`Sin coincidencia: ${noMatches}`);
  console.log(`Tiempo total: ${((finishedAt - startedAt) / 1000).toFixed(2)} s`);
}

main().catch((error) => {
  console.error("Error ejecutando benchmark:", error);
  process.exitCode = 1;
});
