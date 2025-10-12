import type { CodeBuilderOptions } from "./code-builder.js"
import { CodeBuilder } from "./code-builder.js"
import type { ImportRequest } from "./imports.js"
import { ImportCollection } from "./imports.js"

export interface CodeFileOptions extends CodeBuilderOptions {
  /**
   * When true, ensures the output ends with a trailing newline.
   */
  trailingNewline?: boolean
}

export class CodeFile {
  private readonly newline: string
  private readonly trailingNewline: boolean
  private readonly preamble: CodeBuilder
  private readonly bodyBuilder: CodeBuilder
  private readonly imports = new ImportCollection()

  constructor(options: CodeFileOptions = {}) {
    const { newline = "\n", trailingNewline = false, ...builderOptions } = options
    this.newline = newline
    this.trailingNewline = trailingNewline
    this.preamble = new CodeBuilder({ newline, ...builderOptions })
    this.bodyBuilder = new CodeBuilder({ newline, ...builderOptions })
  }

  get body(): CodeBuilder {
    return this.bodyBuilder
  }

  addPreambleLine(line: string): this {
    this.preamble.line(line)
    return this
  }

  addPreambleComment(comment: string): this {
    this.preamble.line(`// ${comment}`)
    return this
  }

  blankLineInPreamble(): this {
    this.preamble.blankLine()
    return this
  }

  addImport(request: ImportRequest): this {
    this.imports.add(request)
    return this
  }

  addDefaultImport(from: string, identifier: string): this {
    this.imports.addDefault(from, identifier)
    return this
  }

  addNamedImport(from: string, name: string, alias?: string): this {
    this.imports.addNamed(from, name, alias)
    return this
  }

  addNamespaceImport(from: string, alias: string): this {
    this.imports.addNamespace(from, alias)
    return this
  }

  addTypeImport(from: string, name: string, alias?: string): this {
    this.imports.addTypeNamed(from, name, alias)
    return this
  }

  addSideEffectImport(from: string): this {
    this.imports.addSideEffect(from)
    return this
  }

  toString(): string {
    const sections: string[] = []

    const preambleSource = this.preamble.toString()
    if (preambleSource.length > 0) {
      sections.push(preambleSource)
    }

    const importLines = this.imports.renderLines()
    if (importLines.length > 0) {
      sections.push(importLines.join(this.newline))
    }

    const bodySource = this.bodyBuilder.toString()
    if (bodySource.length > 0) {
      sections.push(bodySource)
    }

    if (sections.length === 0) {
      return ""
    }

    const source = sections.join(this.newline + this.newline)
    return this.trailingNewline ? source + this.newline : source
  }
}
