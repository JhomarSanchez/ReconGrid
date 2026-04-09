class ExcelColumn {
  constructor(letter, index, header) {
    this.letter = letter;
    this.index = index;
    this.header = header;
  }

  static fromIndex(index) {
    const letter = this.indexToLetter(index);
    return new ExcelColumn(letter, index, null);
  }

  static indexToLetter(index) {
    let letter = "";
    while (index > 0) {
      const remainder = (index - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      index = Math.floor((index - 1) / 26);
    }
    return letter;
  }

  static letterToIndex(letter) {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 64);
    }
    return index;
  }
}

module.exports = ExcelColumn;
