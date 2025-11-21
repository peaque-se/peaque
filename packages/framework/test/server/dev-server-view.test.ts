import { createDevRouterModule } from "../../src/server/dev-server-view.js"
import { fastRefreshify } from "../../src/compiler/fast-refreshify.js"
import { makeImportsRelative } from "../../src/compiler/imports.js"
import { buildFrontendEntryModule } from "../../src/compiler/frontend-entry.js"
import { serializeRouterToJs } from "../../src/router/serializer.js"
import { describe, test, expect, jest, beforeEach } from '@jest/globals'

// Mock dependencies
jest.mock('../../src/compiler/fast-refreshify.js')
jest.mock('../../src/compiler/imports.js')
jest.mock('../../src/compiler/frontend-entry.js')
jest.mock('../../src/router/serializer.js')

const mockFastRefreshify = fastRefreshify as jest.MockedFunction<typeof fastRefreshify>
const mockMakeImportsRelative = makeImportsRelative as jest.MockedFunction<typeof makeImportsRelative>
const mockBuildFrontendEntryModule = buildFrontendEntryModule as jest.MockedFunction<typeof buildFrontendEntryModule>
const mockSerializeRouterToJs = serializeRouterToJs as jest.MockedFunction<typeof serializeRouterToJs>

describe('dev-server-view', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createDevRouterModule', () => {
    test('should create router module with strict mode enabled', () => {
      const mockState = {
        router: { some: 'router' },
        imports: [{ identifier: 'Test', importPath: 'test' }],
        specialPages: {}
      }
      const mockRouterSource = 'router source'
      const mockEntrySource = 'entry source'
      const mockRefreshified = 'refreshified source'
      const mockProcessed = 'processed source'

      mockSerializeRouterToJs.mockReturnValue(mockRouterSource)
      mockBuildFrontendEntryModule.mockReturnValue(mockEntrySource)
      mockFastRefreshify.mockReturnValue(mockRefreshified)
      mockMakeImportsRelative.mockReturnValue(mockProcessed)

      const result = createDevRouterModule(mockState as any, true)

      expect(mockSerializeRouterToJs).toHaveBeenCalledWith(mockState.router, true)
      expect(mockBuildFrontendEntryModule).toHaveBeenCalledWith({
        headerComment: "Peaque Dev Server",
        routerSource: mockRouterSource,
        componentImports: mockState.imports,
        specialPages: mockState.specialPages,
        strictMode: true,
        renderMode: "component",
        routerModule: "@peaque/framework",
        enableRouterUpdate: true,
      })
      expect(mockFastRefreshify).toHaveBeenCalledWith(mockEntrySource, "peaque.tsx")
      expect(mockMakeImportsRelative).toHaveBeenCalledWith(mockRefreshified)
      expect(result).toBe(mockProcessed)
    })

    test('should create router module with strict mode disabled', () => {
      const mockState = {
        router: { some: 'router' },
        imports: [],
        specialPages: { error: { identifier: 'ErrorPage', importPath: 'error' } }
      }

      mockSerializeRouterToJs.mockReturnValue('router source')
      mockBuildFrontendEntryModule.mockReturnValue('entry source')
      mockFastRefreshify.mockReturnValue('refreshified source')
      mockMakeImportsRelative.mockReturnValue('processed source')

      const result = createDevRouterModule(mockState as any, false)

      expect(mockBuildFrontendEntryModule).toHaveBeenCalledWith(expect.objectContaining({
        strictMode: false
      }))
      expect(result).toBe('processed source')
    })
  })
})