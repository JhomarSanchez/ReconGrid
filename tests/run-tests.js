const assert = require("node:assert/strict");

const CompareExcelsUseCase = require("../domain/usecases/CompareExcelsUseCase");
const CompareWithinSheetUseCase = require("../domain/usecases/CompareWithinSheetUseCase");
const ExcelRow = require("../domain/entities/ExcelRow");

function createRow(rowNumber, cells) {
  return new ExcelRow(
    rowNumber,
    new Map(Object.entries(cells).map(([index, value]) => [Number(index), value]))
  );
}

function createCompareFile(kind, searchColumns = [{ index: 1 }]) {
  return { kind, searchColumns };
}

class CompareRepositoryStub {
  constructor(sourceRows, targetRows) {
    this.sourceRows = sourceRows;
    this.targetRows = targetRows;
  }

  async getAllRows(file) {
    return file.kind === "source" ? this.sourceRows : this.targetRows;
  }
}

class InternalComparisonRepositoryStub {
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

const tests = [
  {
    name: "matches exact and normalized identifier variants",
    async run() {
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

      const repository = new CompareRepositoryStub(sourceRows, targetRows);
      const useCase = new CompareExcelsUseCase(repository);

      const results = await useCase.execute(
        createCompareFile("source"),
        createCompareFile("target")
      );

      assert.equal(results.length, 4);
      assert.equal(results[0].isExact(), true);
      assert.equal(results[1].isExact(), true);
      assert.equal(results[2].isExact(), true);
      assert.equal(results[3].matchType, "no_match");
    },
  },
  {
    name: "skips only true duplicates in source rows",
    async run() {
      const sourceRows = [
        createRow(2, { 1: "ABC-123", 2: "first value" }),
        createRow(3, { 1: "ABC-123", 2: "first value" }),
        createRow(4, { 1: "ABC-123", 2: "second value" }),
      ];

      const targetRows = [createRow(2, { 1: "ABC 123" })];

      const repository = new CompareRepositoryStub(sourceRows, targetRows);
      const useCase = new CompareExcelsUseCase(repository);

      const results = await useCase.execute(
        createCompareFile("source"),
        createCompareFile("target")
      );

      assert.equal(results.length, 2);
      assert.equal(results.every((result) => result.isExact()), true);
    },
  },
  {
    name: "compares internal columns using trimmed uppercase values",
    async run() {
      const repository = new InternalComparisonRepositoryStub(
        [
          createRow(2, { 1: "abc-123 ", 2: "ABC-123" }),
          createRow(3, { 1: "one", 2: "two" }),
        ],
        [
          { letter: "A", header: "Source code" },
          { letter: "B", header: "Target code" },
        ]
      );

      const useCase = new CompareWithinSheetUseCase(repository);
      const result = await useCase.execute({
        filePath: "demo.xlsx",
        sheetName: "Sheet1",
        headerRow: 1,
        column1: "A",
        column2: "B",
        resultColumnName: "Match verdict",
      });

      assert.equal(result.stats.total, 2);
      assert.equal(result.stats.equal, 1);
      assert.equal(result.stats.different, 1);
      assert.equal(result.results[0].comparison, "IGUALES");
      assert.equal(result.results[1].comparison, "DIFERENTES");
    },
  },
];

async function main() {
  let failed = false;

  for (const testCase of tests) {
    try {
      await testCase.run();
      console.log(`PASS ${testCase.name}`);
    } catch (error) {
      failed = true;
      console.error(`FAIL ${testCase.name}`);
      console.error(error);
    }
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log(`Completed ${tests.length} tests successfully.`);
}

main().catch((error) => {
  console.error("Unexpected test runner failure:", error);
  process.exitCode = 1;
});
