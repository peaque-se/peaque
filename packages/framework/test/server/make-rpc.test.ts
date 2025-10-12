import { makeRpcShim, type ServerShim } from "../../src/server/make-rpc.js"
import { describe, test, expect, jest, beforeEach } from '@jest/globals'

// Mock ts-morph
jest.mock('ts-morph', () => ({
  Project: jest.fn(),
  Node: {
    isFunctionDeclaration: jest.fn(),
    isVariableDeclaration: jest.fn(),
    isArrowFunction: jest.fn(),
    isFunctionExpression: jest.fn()
  }
}))

// Mock codegen
jest.mock('../../src/codegen/index.js', () => ({
  CodeFile: jest.fn()
}))

const mockProject = require('ts-morph').Project
const mockNode = require('ts-morph').Node
const mockCodeFile = require('../../src/codegen/index.js').CodeFile

describe('makeRpcShim', () => {
  let mockSourceFile: any
  let mockCodeFileInstance: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock source file
    mockSourceFile = {
      getExportedDeclarations: jest.fn().mockReturnValue(new Map()),
      getExportAssignments: jest.fn().mockReturnValue([])
    }

    const mockProjectInstance = {
      createSourceFile: jest.fn().mockReturnValue(mockSourceFile)
    }

    mockProject.mockImplementation(() => mockProjectInstance)

    // Setup mock CodeFile
    mockCodeFileInstance = {
      addNamespaceImport: jest.fn(),
      body: {
        block: jest.fn(),
        blankLine: jest.fn(),
        line: jest.fn()
      },
      toString: jest.fn().mockReturnValue('mocked shim code')
    }

    mockCodeFile.mockImplementation(() => mockCodeFileInstance)
  })

  test('should generate RPC shim for async function declaration export', async () => {
    const mockFuncDecl = {
      isAsync: jest.fn().mockReturnValue(true)
    }

    mockSourceFile.getExportedDeclarations.mockReturnValue(
      new Map([['testFunc', [mockFuncDecl]]])
    )

    mockNode.isFunctionDeclaration.mockReturnValue(true)

    const result: ServerShim = await makeRpcShim('export async function testFunc() {}', 'test/path')

    expect(result.path).toBe('test/path')
    expect(result.exportedFunctions).toEqual([{ name: 'testFunc' }])
    expect(mockCodeFileInstance.addNamespaceImport).toHaveBeenCalledWith("superjson", "superjson")
    expect(mockCodeFileInstance.body.line).toHaveBeenCalledWith("export const testFunc = async (...args) => rpcCall('testFunc', args);")
    expect(result.shim).toBe('mocked shim code')
  })

  test('should generate RPC shim for async arrow function export', async () => {
    const mockArrowFunc = {
      isAsync: jest.fn().mockReturnValue(true)
    }

    const mockVarDecl = {
      getInitializer: jest.fn().mockReturnValue(mockArrowFunc)
    }

    mockSourceFile.getExportedDeclarations.mockReturnValue(
      new Map([['arrowFunc', [mockVarDecl]]])
    )

    // Control the flow: not a function declaration, but a variable declaration with arrow function
    mockNode.isFunctionDeclaration.mockReturnValue(false)
    mockNode.isVariableDeclaration.mockReturnValue(true)
    mockNode.isArrowFunction.mockReturnValue(true)

    const result: ServerShim = await makeRpcShim('export const arrowFunc = async () => {}', 'arrow/path')

    expect(result.exportedFunctions).toEqual([{ name: 'arrowFunc' }])
    expect(mockCodeFileInstance.body.line).toHaveBeenCalledWith("export const arrowFunc = async (...args) => rpcCall('arrowFunc', args);")
  })

  test('should generate RPC shim for async function expression export', async () => {
    const mockFuncExpr = {
      isAsync: jest.fn().mockReturnValue(true)
    }

    const mockVarDecl = {
      getInitializer: jest.fn().mockReturnValue(mockFuncExpr)
    }

    mockSourceFile.getExportedDeclarations.mockReturnValue(
      new Map([['funcExpr', [mockVarDecl]]])
    )

    mockNode.isFunctionDeclaration.mockReturnValue(false)
    mockNode.isVariableDeclaration.mockReturnValue(true)
    mockNode.isFunctionExpression.mockReturnValue(true)

    const result: ServerShim = await makeRpcShim('export const funcExpr = async function() {}', 'func/path')

    expect(result.exportedFunctions).toEqual([{ name: 'funcExpr' }])
    expect(mockCodeFileInstance.body.line).toHaveBeenCalledWith("export const funcExpr = async (...args) => rpcCall('funcExpr', args);")
  })

  test('should generate RPC shim for default export async function', async () => {
    const mockDefaultFunc = {
      getAsyncKeyword: jest.fn().mockReturnValue({})
    }

    const mockExportAssign = {
      isExportEquals: jest.fn().mockReturnValue(false),
      getExpression: jest.fn().mockReturnValue(mockDefaultFunc)
    }

    mockSourceFile.getExportAssignments.mockReturnValue([mockExportAssign])

    mockNode.isFunctionDeclaration.mockReturnValue(true)

    const result: ServerShim = await makeRpcShim('export default async function() {}', 'default/path')

    expect(result.exportedFunctions).toEqual([{ name: 'default' }])
    expect(mockCodeFileInstance.body.line).toHaveBeenCalledWith("export default async (...args) => rpcCall('default', args);")
  })

  test('should handle multiple exported functions', async () => {
    const mockFunc1 = { isAsync: jest.fn().mockReturnValue(true) }
    const mockFunc2 = { isAsync: jest.fn().mockReturnValue(true) }

    mockSourceFile.getExportedDeclarations.mockReturnValue(
      new Map([
        ['func1', [mockFunc1]],
        ['func2', [mockFunc2]]
      ])
    )

    mockNode.isFunctionDeclaration.mockReturnValue(true)

    const result: ServerShim = await makeRpcShim('export async function func1() {}\nexport async function func2() {}', 'multi/path')

    expect(result.exportedFunctions).toHaveLength(2)
    expect(result.exportedFunctions).toEqual(
      expect.arrayContaining([
        { name: 'func1' },
        { name: 'func2' }
      ])
    )
    expect(mockCodeFileInstance.body.line).toHaveBeenCalledWith("export const func1 = async (...args) => rpcCall('func1', args);")
    expect(mockCodeFileInstance.body.line).toHaveBeenCalledWith("export const func2 = async (...args) => rpcCall('func2', args);")
  })

  test('should throw error for non-async exported function', async () => {
    const mockFuncDecl = {
      isAsync: jest.fn().mockReturnValue(false)
    }

    mockSourceFile.getExportedDeclarations.mockReturnValue(
      new Map([['syncFunc', [mockFuncDecl]]])
    )

    mockNode.isFunctionDeclaration.mockReturnValue(true)

    await expect(makeRpcShim('export function syncFunc() {}', 'sync/path'))
      .rejects.toThrow('Exported function syncFunc is not async')
  })

  test('should throw error for non-async arrow function', async () => {
    const mockArrowFunc = {
      isAsync: jest.fn().mockReturnValue(false)
    }

    const mockVarDecl = {
      getInitializer: jest.fn().mockReturnValue(mockArrowFunc)
    }

    mockSourceFile.getExportedDeclarations.mockReturnValue(
      new Map([['syncArrow', [mockVarDecl]]])
    )

    mockNode.isFunctionDeclaration.mockReturnValue(false)
    mockNode.isVariableDeclaration.mockReturnValue(true)
    mockNode.isArrowFunction.mockReturnValue(true)

    await expect(makeRpcShim('export const syncArrow = () => {}', 'sync/arrow'))
      .rejects.toThrow('Exported function syncArrow is not async')
  })

  test('should throw error for non-async default export', async () => {
    const mockDefaultFunc = {
      getAsyncKeyword: jest.fn().mockReturnValue(undefined)
    }

    const mockExportAssign = {
      isExportEquals: jest.fn().mockReturnValue(false),
      getExpression: jest.fn().mockReturnValue(mockDefaultFunc)
    }

    mockSourceFile.getExportAssignments.mockReturnValue([mockExportAssign])

    mockNode.isFunctionDeclaration.mockReturnValue(true)

    await expect(makeRpcShim('export default function syncDefault() {}', 'sync/default'))
      .rejects.toThrow('Exported function default is not async')
  })

  test('should include proper RPC call structure', async () => {
    const mockFuncDecl = {
      isAsync: jest.fn().mockReturnValue(true)
    }

    mockSourceFile.getExportedDeclarations.mockReturnValue(
      new Map([['test', [mockFuncDecl]]])
    )

    mockNode.isFunctionDeclaration.mockReturnValue(true)

    const result: ServerShim = await makeRpcShim('export async function test() {}', 'test/path')

    expect(mockCodeFileInstance.addNamespaceImport).toHaveBeenCalledWith("superjson", "superjson")
    expect(mockCodeFileInstance.body.block).toHaveBeenCalledWith("const rpcCall = async (funcName, args) => {", expect.any(Function), { close: "};" })
    expect(mockCodeFileInstance.body.line).toHaveBeenCalledWith("export const test = async (...args) => rpcCall('test', args);")
  })

  test('should handle empty source content', async () => {
    const result: ServerShim = await makeRpcShim('', 'empty/path')

    expect(result.path).toBe('empty/path')
    expect(result.exportedFunctions).toEqual([])
    expect(mockCodeFileInstance.addNamespaceImport).toHaveBeenCalledWith("superjson", "superjson")
    expect(mockCodeFileInstance.body.block).toHaveBeenCalledWith("const rpcCall = async (funcName, args) => {", expect.any(Function), { close: "};" })
    // Should have the RPC call function but no exports
    expect(mockCodeFileInstance.body.line).not.toHaveBeenCalledWith(expect.stringContaining('export '))
  })
})