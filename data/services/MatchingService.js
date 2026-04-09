class MatchingService {
  constructor() {
    this.cache = new Map();
  }

  clearCache() {
    this.cache.clear();
  }

  findMatches(sourceCodes, targetCodes) {
    const matches = [];

    for (const sourceCode of sourceCodes) {
      if (!sourceCode || sourceCode.trim() === "") continue;

      for (const targetCode of targetCodes) {
        if (!targetCode || targetCode.trim() === "") continue;

        const cacheKey = `${sourceCode}::${targetCode}`;

        if (this.cache.has(cacheKey)) {
          matches.push(this.cache.get(cacheKey));
        } else {
          const matchType = this.determineMatchType(sourceCode, targetCode);
          if (matchType) {
            const match = {
              sourceCode,
              targetCode,
              matchType,
            };
            this.cache.set(cacheKey, match);
            matches.push(match);
          }
        }
      }
    }

    return matches;
  }

  determineMatchType(source, target) {
    const src = source.toString().trim();
    const tgt = target.toString().trim();

    // Exacta
    if (src === tgt) {
      return "exact";
    }

    return null;
  }
}

module.exports = MatchingService;
