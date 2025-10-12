export interface NamedImport {
  name: string
  alias?: string
}

export interface ImportRequest {
  from: string
  defaultImport?: string
  namespaceImport?: string
  named?: Array<string | NamedImport>
  typeOnly?: boolean
  sideEffectOnly?: boolean
}

interface ImportEntry {
  defaultImport?: string
  namespaceImport?: string
  named: Map<string, string | undefined>
  typeOnly: boolean
}

export class ImportCollection {
  private readonly entries = new Map<string, ImportEntry>()
  private readonly sideEffectImports = new Set<string>()

  add(request: ImportRequest): void {
    if (request.sideEffectOnly) {
      this.sideEffectImports.add(request.from)
      return
    }

    if (request.typeOnly && (request.defaultImport || request.namespaceImport)) {
      throw new Error(`Type-only imports cannot include default or namespace specifiers for "${request.from}".`)
    }

    const existing = this.entries.get(request.from)
    if (!existing) {
      this.entries.set(request.from, {
        defaultImport: request.defaultImport,
        namespaceImport: request.namespaceImport,
        named: this.toNamedMap(request.named),
        typeOnly: Boolean(request.typeOnly),
      })
      return
    }

    if (request.defaultImport) {
      if (existing.defaultImport && existing.defaultImport !== request.defaultImport) {
        throw new Error(`Conflicting default imports for "${request.from}".`)
      }
      existing.defaultImport = request.defaultImport
    }

    if (request.namespaceImport) {
      if (existing.namespaceImport && existing.namespaceImport !== request.namespaceImport) {
        throw new Error(`Conflicting namespace imports for "${request.from}".`)
      }
      existing.namespaceImport = request.namespaceImport
    }

    if (request.named) {
      for (const [name, alias] of this.toNamedMap(request.named)) {
        existing.named.set(name, alias)
      }
    }

    if (!request.typeOnly) {
      existing.typeOnly = false
    }
  }

  addDefault(from: string, identifier: string): void {
    this.add({ from, defaultImport: identifier })
  }

  addNamed(from: string, name: string, alias?: string): void {
    this.add({ from, named: [{ name, alias }] })
  }

  addNamespace(from: string, alias: string): void {
    this.add({ from, namespaceImport: alias })
  }

  addTypeNamed(from: string, name: string, alias?: string): void {
    this.add({ from, named: [{ name, alias }], typeOnly: true })
  }

  addSideEffect(from: string): void {
    this.add({ from, sideEffectOnly: true })
  }

  renderLines(): string[] {
    const rendered: string[] = []

    const orderedImports = [...this.entries.entries()].sort(([a], [b]) => a.localeCompare(b))
    for (const [modulePath, entry] of orderedImports) {
      const parts: string[] = []

      if (entry.defaultImport) {
        parts.push(entry.defaultImport)
      }

      if (entry.namespaceImport) {
        parts.push(`* as ${entry.namespaceImport}`)
      }

      if (entry.named.size > 0) {
        const namedSpecifiers = [...entry.named.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, alias]) => (alias ? `${name} as ${alias}` : name))
          .join(", ")
        parts.push(`{ ${namedSpecifiers} }`)
      }

      if (parts.length === 0) {
        rendered.push(`import "${modulePath}";`)
        continue
      }

      const importKeyword = entry.typeOnly && !entry.defaultImport && !entry.namespaceImport ? "import type" : "import"
      rendered.push(`${importKeyword} ${parts.join(", ")} from "${modulePath}";`)
    }

    if (this.sideEffectImports.size > 0) {
      if (rendered.length > 0) {
        rendered.push("")
      }

      for (const modulePath of [...this.sideEffectImports].sort()) {
        rendered.push(`import "${modulePath}";`)
      }
    }

    return rendered
  }

  private toNamedMap(named?: Array<string | NamedImport>): Map<string, string | undefined> {
    const map = new Map<string, string | undefined>()
    if (!named) {
      return map
    }

    for (const entry of named) {
      if (typeof entry === "string") {
        map.set(entry, undefined)
      } else {
        map.set(entry.name, entry.alias)
      }
    }
    return map
  }
}
