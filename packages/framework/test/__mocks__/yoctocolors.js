// Mock for yoctocolors to avoid ES module parsing issues in Jest
const mockColor = (str) => str;

module.exports = {
  default: {
    bold: mockColor,
    gray: mockColor,
    green: mockColor,
    yellow: mockColor,
    magenta: mockColor,
    red: mockColor,
    blue: mockColor,
    cyan: mockColor,
    white: mockColor,
    black: mockColor,
  },
  bold: mockColor,
  gray: mockColor,
  green: mockColor,
  yellow: mockColor,
  magenta: mockColor,
  red: mockColor,
  blue: mockColor,
  cyan: mockColor,
  white: mockColor,
  black: mockColor,
};
