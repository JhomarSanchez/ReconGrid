const test = require("node:test");
const assert = require("node:assert/strict");

const CompareWithinSheetUseCase = require("../domain/usecases/CompareWithinSheetUseCase");
const ExcelRow = require("../domain/entities/ExcelRow");

function createRow(rowNumber, cells) {
  return new ExcelRow(
    rowNumber,
    new Map(Object.entries(cells).map(([index, value]) => [Number(index), value]))
  );
}

class FakeRepository {
  constructor(rows, previewColumns) {
    this.rows = rows;
    this.previewColumns = previewColumns;
  }

  async getSheetPreview() {
    return {
      columns: this.previewColumns,
      rows: [],
    };
  }

  async getRowsFromSheet() {
    return this.rows;
  }
}

test("compara columnas internas normalizando mayusculas y espacios", async () => {
  const repository = new FakeRepository(
    [
      createRow(2, { 1: "abc-123 ", 2: "ABC-123" }),
      createRow(3, { 1: "uno", 2: "dos" }),
    ],
    [
      { letter: "A", header: "Codigo origen" },
      { letter: "B", header: "Codigo destino" },
    ]
  );

  const useCase = new CompareWithinSheetUseCase(repository);
  const result = await useCase.execute({
    filePath: "demo.xlsx",
    sheetName: "Hoja1",
    headerRow: 1,
    column1: "A",
    column2: "B",
    resultColumnName: "Concordancia",
  });

  assert.equal(result.stats.total, 2);
  assert.equal(result.stats.equal, 1);
  assert.equal(result.stats.different, 1);
  assert.equal(result.results[0].comparison, "IGUALES");
  assert.equal(result.results[1].comparison, "DIFERENTES");
});
