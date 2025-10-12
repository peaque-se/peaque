import { fastRefreshify } from "../compiler/fast-refreshify.js"
import { makeImportsRelative } from "../compiler/imports.js"
import { buildFrontendEntryModule } from "../compiler/frontend-entry.js"
import { serializeRouterToJs } from "../router/serializer.js"
import type { FrontendState } from "./dev-server-state.js"

export function createDevRouterModule(state: FrontendState, strictMode: boolean): string {
  const routerSource = serializeRouterToJs(state.router, true)
  const entrySource = buildFrontendEntryModule({
    headerComment: "Peaque Dev Server",
    routerSource,
    componentImports: state.imports,
    specialPages: state.specialPages,
    strictMode,
    renderMode: "component",
    routerModule: "@peaque/framework",
  })
  const refreshified = fastRefreshify(entrySource, "peaque.tsx")
  return makeImportsRelative(refreshified)
}
