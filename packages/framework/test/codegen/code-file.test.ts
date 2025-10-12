import { CodeBuilder, CodeFile } from "../../src/codegen/index.js"

describe("CodeBuilder", () => {
  it("supports indentation and nested blocks", () => {
    const builder = new CodeBuilder()
    builder.line("function demo() {")
    builder.indented(inner => {
      inner.line("const value = 1;")
      inner.block("if (value) {", block => {
        block.line("return value;")
      })
    })
    builder.line("}")

    expect(builder.toString()).toBe(
      [
        "function demo() {",
        "  const value = 1;",
        "  if (value) {",
        "    return value;",
        "  }",
        "}",
      ].join("\n"),
    )
  })
})

describe("CodeFile", () => {
  it("emits preamble, imports, and body with deduplicated specifiers", () => {
    const file = new CodeFile()
    file.addPreambleComment("Auto-generated file")
    file.addPreambleComment("Do not edit directly")

    file.addNamedImport("react", "StrictMode")
    file.addNamedImport("react", "useMemo")
    file.addNamedImport("react-dom/client", "createRoot")
    file.addSideEffectImport("./polyfills.js")

    file.body.line("const conf = {};")

    expect(file.toString()).toBe(
      [
        "// Auto-generated file",
        "// Do not edit directly",
        "",
        'import { StrictMode, useMemo } from "react";',
        'import { createRoot } from "react-dom/client";',
        "",
        'import "./polyfills.js";',
        "",
        "const conf = {};",
      ].join("\n"),
    )
  })

  it("promotes type-only imports to value imports when mixed", () => {
    const file = new CodeFile()

    file.addTypeImport("./types.js", "Foo")
    file.addNamedImport("./types.js", "Bar")

    expect(file.toString()).toContain('import { Bar, Foo } from "./types.js";')
  })
})
