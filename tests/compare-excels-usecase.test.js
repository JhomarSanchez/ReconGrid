const test = require("node:test");
const assert = require("node:assert/strict");

const CompareExcelsUseCase = require("../domain/usecases/CompareExcelsUseCase");
const ExcelRow = require("../domain/entities/ExcelRow");

function createRow(rowNumber, cells) {
  return new ExcelRow(
    rowNumber,
    new Map(Object.entries(cells).map(([index, value]) => [Number(index), value]))
  );
}

function createFile(kind, searchColumns = [{ index: 1 }]) {
  return {
    kind,
    searchColumns,
  };
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

test("encuentra coincidencias exactas y por normalizacion flexible", async () => {
  const sourceRows = [
    createRow(2, { 1: "ABC-123" }),
    createRow(3, { 1: "ZX 900" }),
    createRow(4, { 1: "QWE-77-RT" }),
    createRow(5, { 1: "NO-MATCH" }),
  ];

  const targetRows = [
    createRow(2, { 1: "ABC 123" }),
    createRow(3, { 1: "ZX900" }),
    createRow(4, { 1: "QWE/77/RT" }),
  ];

  const repository = new FakeRepository(sourceRows, targetRows);
  const useCase = new CompareExcelsUseCase(repository);

  const results = await useCase.execute(
    createFile("source"),
    createFile("target")
  );

  assert.equal(results.length, 4);
  assert.equal(results[0].isExact(), true);
  assert.equal(results[1].isExact(), true);
  assert.equal(results[2].isExact(), true);
  assert.equal(results[3].matchType, "no_match");
});

test("omite duplicados reales pero conserva filas con el mismo codigo y contenido distinto", async () => {
  const sourceRows = [
    createRow(2, { 1: "ABC-123", 2: "primer valor" }),
    createRow(3, { 1: "ABC-123", 2: "primer valor" }),
    createRow(4, { 1: "ABC-123", 2: "segundo valor" }),
  ];

  const targetRows = [createRow(2, { 1: "ABC 123" })];

  const repository = new FakeRepository(sourceRows, targetRows);
  const useCase = new CompareExcelsUseCase(repository);

  const results = await useCase.execute(
    createFile("source"),
    createFile("target")
  );

  assert.equal(results.length, 2);
  assert.equal(results.every((result) => result.isExact()), true);
});
