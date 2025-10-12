import { describe, it, expect, beforeEach } from "@jest/globals"
import { setupImportAliases, makeImportsRelative } from "../../src/compiler/imports.js"

describe("imports utilities", () => {
  beforeEach(() => {
    setupImportAliases({ compilerOptions: { paths: {} } })
  })

  it("normalizes tsconfig path aliases and stores them globally", () => {
    const aliases = setupImportAliases({
      compilerOptions: {
        paths: {
          "@app/*": ["src/app/*"],
          "@lib": ["lib/index.ts"],
        },
      },
    })

    expect(aliases).toEqual({
      "@app": "src/app",
      "@lib": "lib/index.ts",
    })

    const rewritten = makeImportsRelative(`import foo from "@app/utils/service"`, "features/widget.ts")
    expect(rewritten).toContain("from '/@src/src/app/utils/service'")
  })

  it("rewrites relative, alias, absolute, and external imports consistently", () => {
    setupImportAliases({
      compilerOptions: {
        paths: {
          "@shared/*": ["shared/*"],
        },
      },
    })

    const source = `
      import Button from "./ui/button.tsx";
      import { Header } from "../layout/header";
      import shared from "@shared/utils";
      import dep from "react";
      const lazy = await import("@shared/lazy/chunk");
      const untouched = await import('/@deps/pre-bundled');
    `

    const result = makeImportsRelative(source, "features/dashboard/view.tsx")

    expect(result).toContain("from '/@src/features/dashboard/ui/button'")
    expect(result).toContain("from '/@src/features/layout/header'")
    expect(result).toContain("from '/@src/shared/utils'")
    expect(result).toContain("from '/@deps/react'")
    expect(result).toContain("import('/@src/shared/lazy/chunk')")
    expect(result).toContain("import('/@deps/pre-bundled')")
  })
})
