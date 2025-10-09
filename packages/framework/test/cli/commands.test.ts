import { jest } from '@jest/globals'

// Mock the version import
jest.mock('../../src/server/version.js', () => ({
  platformVersion: '1.0.0'
}))

import { createCommandLineParser } from '../../src/cli/commandline-parser.js'
import type { DevCommandOptions, BuildCommandOptions, StartCommandOptions } from '../../src/cli/commands.js'
import type { DevServer } from '../../src/server/dev-server.js'
import path from 'path'

describe('CLI Command Parsing', () => {
  let mockDevCommand: jest.MockedFunction<(options: DevCommandOptions) => Promise<DevServer>>
  let mockBuildCommand: jest.MockedFunction<(options: BuildCommandOptions) => Promise<void>>
  let mockStartCommand: jest.MockedFunction<(options: StartCommandOptions) => Promise<void>>

  beforeEach(() => {
    mockDevCommand = jest.fn<(options: DevCommandOptions) => Promise<DevServer>>().mockResolvedValue({} as DevServer)
    mockBuildCommand = jest.fn<(options: BuildCommandOptions) => Promise<void>>().mockResolvedValue(undefined)
    mockStartCommand = jest.fn<(options: StartCommandOptions) => Promise<void>>().mockResolvedValue(undefined)
  })

  // Helper function to parse and test commands
  const parseCommand = (args: string[]) => {
    const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
    program.parse(args)
  }

  describe('dev command', () => {
    it('should parse "peaque dev" with default options', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 3000,
        strict: true,
        fullStackTrace: false
      })
    })

    it('should parse "peaque dev -p 2000" with custom port', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev', '-p', '2000'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 2000,
        strict: true,
        fullStackTrace: false
      })
    })

    it('should parse "peaque dev --port 4000" with custom port', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev', '--port', '4000'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 4000,
        strict: true,
        fullStackTrace: false
      })
    })

    it('should parse "peaque dev -b /custom/path" with custom base path', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev', '-b', '/custom/path'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: '/custom/path',
        port: 3000,
        strict: true,
        fullStackTrace: false
      })
    })

    it('should parse "peaque dev --base /custom/path" with custom base path', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev', '--base', '/custom/path'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: '/custom/path',
        port: 3000,
        strict: true,
        fullStackTrace: false
      })
    })

    it('should parse "peaque dev --no-strict" with strict mode disabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev', '--no-strict'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 3000,
        strict: false,
        fullStackTrace: false
      })
    })

    it('should parse "peaque dev --full-stack-traces" with full stack traces enabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev', '--full-stack-traces'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 3000,
        strict: true,
        fullStackTrace: true
      })
    })

    it('should parse "peaque dev -p 5000 -b /path --no-strict --full-stack-traces" with all options', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'dev', '-p', '5000', '-b', '/path', '--no-strict', '--full-stack-traces'])

      expect(mockDevCommand).toHaveBeenCalledWith({
        basePath: '/path',
        port: 5000,
        strict: false,
        fullStackTrace: true
      })
    })
  })

  describe('build command', () => {
    it('should parse "peaque build" with default options', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: path.join(process.cwd(), 'dist'),
        minify: true,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build -o /custom/output" with custom output', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '-o', '/custom/output'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: '/custom/output',
        minify: true,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build --output /custom/output" with custom output', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--output', '/custom/output'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: '/custom/output',
        minify: true,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build -b /custom/path" with custom base path', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '-b', '/custom/path'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: '/custom/path',
        output: path.join('/custom/path', 'dist'),
        minify: true,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build --base /custom/path" with custom base path', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--base', '/custom/path'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: '/custom/path',
        output: path.join('/custom/path', 'dist'),
        minify: true,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build --no-minify" with minification disabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--no-minify'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: path.join(process.cwd(), 'dist'),
        minify: false,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build -b /path -o /output --no-minify" with all options', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '-b', '/path', '-o', '/output', '--no-minify'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: '/path',
        output: '/output',
        minify: false,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build --analyze" with analyze enabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--analyze'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: path.join(process.cwd(), 'dist'),
        minify: true,
        analyze: true,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build -b /path -o /output --no-minify --analyze" with all options including analyze', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '-b', '/path', '-o', '/output', '--no-minify', '--analyze'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: '/path',
        output: '/output',
        minify: false,
        analyze: true,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build --no-asset-rewrite" with asset rewriting disabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--no-asset-rewrite'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: path.join(process.cwd(), 'dist'),
        minify: true,
        analyze: false,
        noAssetRewrite: true,
        serverlessFrontend: false,
        reactCompiler: true
      })
    })

    it('should parse "peaque build --serverless-frontend" with serverless frontend enabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--serverless-frontend'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: path.join(process.cwd(), 'dist'),
        minify: true,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: true,
        reactCompiler: true
      })
    })

    it('should parse "peaque build -b /path -o /output --serverless-frontend --analyze" with serverless frontend and other options', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '-b', '/path', '-o', '/output', '--serverless-frontend', '--analyze'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: '/path',
        output: '/output',
        minify: true,
        analyze: true,
        noAssetRewrite: false,
        serverlessFrontend: true,
        reactCompiler: true
      })
    })

    it('should parse "peaque build --no-react-compiler" with React Compiler disabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--no-react-compiler'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: path.join(process.cwd(), 'dist'),
        minify: true,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: false
      })
    })

    it('should parse "peaque build -b /path --no-react-compiler --no-minify" with React Compiler and minify disabled', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '-b', '/path', '--no-react-compiler', '--no-minify'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: '/path',
        output: path.join('/path', 'dist'),
        minify: false,
        analyze: false,
        noAssetRewrite: false,
        serverlessFrontend: false,
        reactCompiler: false
      })
    })

    it('should parse "peaque build --analyze --no-react-compiler --serverless-frontend" with multiple flags', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'build', '--analyze', '--no-react-compiler', '--serverless-frontend'])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        output: path.join(process.cwd(), 'dist'),
        minify: true,
        analyze: true,
        noAssetRewrite: false,
        serverlessFrontend: true,
        reactCompiler: false
      })
    })

    it('should parse all build options together', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse([
        'node', 'peaque', 'build',
        '-b', '/custom/base',
        '-o', '/custom/output',
        '--no-minify',
        '--analyze',
        '--no-asset-rewrite',
        '--serverless-frontend',
        '--no-react-compiler'
      ])

      expect(mockBuildCommand).toHaveBeenCalledWith({
        basePath: '/custom/base',
        output: '/custom/output',
        minify: false,
        analyze: true,
        noAssetRewrite: true,
        serverlessFrontend: true,
        reactCompiler: false
      })
    })
  })

  describe('start command', () => {
    it('should parse "peaque start" with default options', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'start'])

      expect(mockStartCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 3000
      })
    })

    it('should parse "peaque start -p 4000" with custom port', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'start', '-p', '4000'])

      expect(mockStartCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 4000
      })
    })

    it('should parse "peaque start --port 5000" with custom port', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'start', '--port', '5000'])

      expect(mockStartCommand).toHaveBeenCalledWith({
        basePath: process.cwd(),
        port: 5000
      })
    })

    it('should parse "peaque start -b /custom/path" with custom base path', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'start', '-b', '/custom/path'])

      expect(mockStartCommand).toHaveBeenCalledWith({
        basePath: '/custom/path',
        port: 3000
      })
    })

    it('should parse "peaque start --base /custom/path" with custom base path', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'start', '--base', '/custom/path'])

      expect(mockStartCommand).toHaveBeenCalledWith({
        basePath: '/custom/path',
        port: 3000
      })
    })

    it('should parse "peaque start -b /path -p 6000" with all options', () => {
      const program = createCommandLineParser(mockDevCommand, mockBuildCommand, mockStartCommand)
      program.parse(['node', 'peaque', 'start', '-b', '/path', '-p', '6000'])

      expect(mockStartCommand).toHaveBeenCalledWith({
        basePath: '/path',
        port: 6000
      })
    })
  })

  describe('edge cases and validation', () => {
    describe('port parsing', () => {
      it('should parse numeric port strings correctly for dev command', () => {
        parseCommand(['node', 'peaque', 'dev', '-p', '8080'])

        expect(mockDevCommand).toHaveBeenCalledWith(
          expect.objectContaining({ port: 8080 })
        )
      })

      it('should parse numeric port strings correctly for start command', () => {
        parseCommand(['node', 'peaque', 'start', '-p', '9000'])

        expect(mockStartCommand).toHaveBeenCalledWith(
          expect.objectContaining({ port: 9000 })
        )
      })

      it('should handle port 0 (system-assigned port)', () => {
        parseCommand(['node', 'peaque', 'dev', '-p', '0'])

        expect(mockDevCommand).toHaveBeenCalledWith(
          expect.objectContaining({ port: 0 })
        )
      })

      it('should handle high port numbers (65535)', () => {
        parseCommand(['node', 'peaque', 'dev', '-p', '65535'])

        expect(mockDevCommand).toHaveBeenCalledWith(
          expect.objectContaining({ port: 65535 })
        )
      })
    })

    describe('path handling', () => {
      it('should handle absolute paths with spaces', () => {
        parseCommand(['node', 'peaque', 'build', '-b', '/path with spaces/project'])

        expect(mockBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            basePath: '/path with spaces/project',
            output: path.join('/path with spaces/project', 'dist')
          })
        )
      })

      it('should handle relative paths', () => {
        parseCommand(['node', 'peaque', 'build', '-b', './my-project'])

        expect(mockBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            basePath: './my-project',
            output: path.join('./my-project', 'dist')
          })
        )
      })

      it('should handle paths with special characters', () => {
        parseCommand(['node', 'peaque', 'dev', '-b', '/path/with-dashes_and_underscores'])

        expect(mockDevCommand).toHaveBeenCalledWith(
          expect.objectContaining({ basePath: '/path/with-dashes_and_underscores' })
        )
      })
    })

    describe('boolean flag combinations', () => {
      it('should handle multiple --no- flags together', () => {
        parseCommand(['node', 'peaque', 'build', '--no-minify', '--no-asset-rewrite', '--no-react-compiler'])

        expect(mockBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            minify: false,
            noAssetRewrite: true,
            reactCompiler: false
          })
        )
      })

      it('should handle mixed positive and negative flags', () => {
        parseCommand(['node', 'peaque', 'build', '--analyze', '--no-minify', '--serverless-frontend', '--no-react-compiler'])

        expect(mockBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            analyze: true,
            minify: false,
            serverlessFrontend: true,
            reactCompiler: false
          })
        )
      })
    })

    describe('default values verification', () => {
      it('should use correct defaults for dev command', () => {
        parseCommand(['node', 'peaque', 'dev'])

        expect(mockDevCommand).toHaveBeenCalledWith({
          basePath: process.cwd(),
          port: 3000,
          strict: true,
          fullStackTrace: false
        })
      })

      it('should use correct defaults for build command', () => {
        parseCommand(['node', 'peaque', 'build'])

        expect(mockBuildCommand).toHaveBeenCalledWith({
          basePath: process.cwd(),
          output: path.join(process.cwd(), 'dist'),
          minify: true,
          analyze: false,
          noAssetRewrite: false,
          serverlessFrontend: false,
          reactCompiler: true
        })
      })

      it('should use correct defaults for start command', () => {
        parseCommand(['node', 'peaque', 'start'])

        expect(mockStartCommand).toHaveBeenCalledWith({
          basePath: process.cwd(),
          port: 3000
        })
      })
    })

    describe('option order independence', () => {
      it('should parse options in any order for build command', () => {
        parseCommand(['node', 'peaque', 'build', '--analyze', '-b', '/path', '--no-minify', '-o', '/out'])

        expect(mockBuildCommand).toHaveBeenCalledWith({
          basePath: '/path',
          output: '/out',
          minify: false,
          analyze: true,
          noAssetRewrite: false,
          serverlessFrontend: false,
          reactCompiler: true
        })
      })

      it('should parse options in reverse order for dev command', () => {
        parseCommand(['node', 'peaque', 'dev', '--full-stack-traces', '--no-strict', '-p', '4000', '-b', '/base'])

        expect(mockDevCommand).toHaveBeenCalledWith({
          basePath: '/base',
          port: 4000,
          strict: false,
          fullStackTrace: true
        })
      })
    })

    describe('React Compiler flag variations', () => {
      it('should enable React Compiler by default', () => {
        parseCommand(['node', 'peaque', 'build'])

        expect(mockBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({ reactCompiler: true })
        )
      })

      it('should respect --no-react-compiler flag', () => {
        parseCommand(['node', 'peaque', 'build', '--no-react-compiler'])

        expect(mockBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({ reactCompiler: false })
        )
      })

      it('should work with --no-react-compiler at different positions', () => {
        parseCommand(['node', 'peaque', 'build', '-b', '/path', '--no-react-compiler', '--analyze'])

        expect(mockBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            basePath: '/path',
            reactCompiler: false,
            analyze: true
          })
        )
      })
    })
  })
})