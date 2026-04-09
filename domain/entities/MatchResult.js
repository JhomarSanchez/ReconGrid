class MatchResult {
  constructor(sourceCode, sourceRow, targetRow, matchType, confidence) {
    this.sourceCode = sourceCode;
    this.sourceRow = sourceRow; // ExcelRow del Excel 1
    this.targetRow = targetRow; // ExcelRow del Excel 2
    this.matchType = matchType; // 'exact' o 'no_match'
    this.confidence = confidence; // 0-100
  }

  isExact() {
    return this.matchType === "exact";
  }
}

module.exports = MatchResult;
