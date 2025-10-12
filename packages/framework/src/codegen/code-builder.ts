export interface CodeBuilderOptions {
  indent?: number | string
  newline?: string
}

export interface BlockOptions {
  /**
   * Override the closing line written after the block body.
   * Use null to skip emitting a closing line.
   */
  close?: string | null
}

export class CodeBuilder {
  private readonly indentUnit: string
  private readonly newline: string
  private indentLevel = 0
  private readonly lines: string[] = []
  private pendingBlankLine = false

  constructor(options: CodeBuilderOptions = {}) {
    const { indent = 2, newline = "\n" } = options
    this.indentUnit = typeof indent === "number" ? " ".repeat(indent) : indent
    this.newline = newline
  }

  line(text = ""): this {
    this.flushPendingBlank()
    if (text.length === 0) {
      this.lines.push("")
    } else {
      this.lines.push(this.currentIndent() + text)
    }
    return this
  }

  linesOf(...values: string[]): this {
    for (const value of values) {
      this.line(value)
    }
    return this
  }

  multiline(text: string): this {
    if (text.length === 0) {
      return this
    }

    this.flushPendingBlank()
    const normalized = text.replace(/\r\n/g, "\n")
    const segments = normalized.split("\n")
    if (segments.length === 0) {
      return this
    }

    for (const segment of segments) {
      const prefixed = segment.length === 0 ? "" : this.currentIndent() + segment
      this.lines.push(prefixed)
    }
    return this
  }

  raw(text: string): this {
    if (text.length === 0) {
      return this
    }
    this.flushPendingBlank()
    const normalized = text.replace(/\r\n/g, "\n")
    const segments = normalized.split("\n")
    for (const segment of segments) {
      this.lines.push(segment)
    }
    return this
  }

  blankLine(): this {
    if (!this.pendingBlankLine && this.lines.length > 0) {
      this.pendingBlankLine = true
    }
    return this
  }

  indented(callback: (builder: CodeBuilder) => void): this {
    this.indentLevel += 1
    try {
      callback(this)
    } finally {
      this.indentLevel -= 1
    }
    return this
  }

  block(headerLine: string, body: (builder: CodeBuilder) => void, options: BlockOptions = {}): this {
    this.line(headerLine)
    this.indented(body)
    if (options.close !== null) {
      const closeLine = options.close ?? "}"
      this.line(closeLine)
    }
    return this
  }

  isEmpty(): boolean {
    return this.lines.length === 0 && !this.pendingBlankLine
  }

  toString(): string {
    const finalLines = [...this.lines]
    if (this.pendingBlankLine && finalLines.length > 0) {
      finalLines.push("")
    }
    return finalLines.join(this.newline)
  }

  private currentIndent(): string {
    return this.indentUnit.repeat(this.indentLevel)
  }

  private flushPendingBlank(): void {
    if (this.pendingBlankLine) {
      this.lines.push("")
      this.pendingBlankLine = false
    }
  }
}
