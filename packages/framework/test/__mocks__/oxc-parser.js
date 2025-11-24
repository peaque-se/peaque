// Mock for oxc-parser to avoid ES module parsing issues in Jest
module.exports = {
  parseSync: (filename, source, options) => {
    // Return a minimal mock AST that matches the structure expected by makeRpcShimOxc
    return {
      errors: [],
      program: {
        type: "Program",
        body: [],
        sourceType: "module"
      }
    };
  }
};
