import { describe, test, expect } from '@jest/globals'
import { runWithRequestContext, useCurrentRequest, tryGetCurrentRequest } from '../../src/http/request-context.js'
import { PeaqueRequestImpl } from '../../src/http/default-impl.js'
import type { PeaqueRequest } from '../../src/http/http-types.js'

describe('Request Context', () => {
  describe('runWithRequestContext', () => {
    test('should set request in context during execution', () => {
      const request = createMockRequest()

      runWithRequestContext(request, () => {
        const currentRequest = tryGetCurrentRequest()
        expect(currentRequest).toBe(request)
      })
    })

    test('should support async functions', async () => {
      const request = createMockRequest()

      await runWithRequestContext(request, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        const currentRequest = tryGetCurrentRequest()
        expect(currentRequest).toBe(request)
      })
    })

    test('should return the result of the function', () => {
      const request = createMockRequest()

      const result = runWithRequestContext(request, () => {
        return 'test result'
      })

      expect(result).toBe('test result')
    })

    test('should return the result of async function', async () => {
      const request = createMockRequest()

      const result = await runWithRequestContext(request, async () => {
        return 'async result'
      })

      expect(result).toBe('async result')
    })

    test('should clear context after execution', () => {
      const request = createMockRequest()

      runWithRequestContext(request, () => {
        expect(tryGetCurrentRequest()).toBe(request)
      })

      expect(tryGetCurrentRequest()).toBeUndefined()
    })

    test('should propagate errors from sync function', () => {
      const request = createMockRequest()

      expect(() => {
        runWithRequestContext(request, () => {
          throw new Error('Test error')
        })
      }).toThrow('Test error')
    })

    test('should propagate errors from async function', async () => {
      const request = createMockRequest()

      await expect(async () => {
        await runWithRequestContext(request, async () => {
          throw new Error('Async error')
        })
      }).rejects.toThrow('Async error')
    })

    test('should support nested contexts', () => {
      const request1 = createMockRequest('/path1')
      const request2 = createMockRequest('/path2')

      runWithRequestContext(request1, () => {
        expect(useCurrentRequest().path()).toBe('/path1')

        runWithRequestContext(request2, () => {
          expect(useCurrentRequest().path()).toBe('/path2')
        })

        // After inner context exits, outer context is restored
        expect(useCurrentRequest().path()).toBe('/path1')
      })
    })
  })

  describe('useCurrentRequest', () => {
    test('should return the current request when in context', () => {
      const request = createMockRequest()

      runWithRequestContext(request, () => {
        const currentRequest = useCurrentRequest()
        expect(currentRequest).toBe(request)
      })
    })

    test('should throw error when called outside context', () => {
      expect(() => {
        useCurrentRequest()
      }).toThrow('useCurrentRequest() can only be called within a request context')
    })

    test('should provide access to request properties', () => {
      const request = createMockRequest('/test-path')

      runWithRequestContext(request, () => {
        const currentRequest = useCurrentRequest()
        expect(currentRequest.path()).toBe('/test-path')
        expect(currentRequest.method()).toBe('GET')
        expect(currentRequest.ip()).toBe('127.0.0.1')
      })
    })

    test('should allow modifying request properties', () => {
      const request = createMockRequest()

      runWithRequestContext(request, () => {
        const currentRequest = useCurrentRequest()
        currentRequest.setPathParam('userId', '123')
        expect(currentRequest.pathParam('userId')).toBe('123')
      })
    })
  })

  describe('tryGetCurrentRequest', () => {
    test('should return the current request when in context', () => {
      const request = createMockRequest()

      runWithRequestContext(request, () => {
        const currentRequest = tryGetCurrentRequest()
        expect(currentRequest).toBe(request)
      })
    })

    test('should return undefined when called outside context', () => {
      const currentRequest = tryGetCurrentRequest()
      expect(currentRequest).toBeUndefined()
    })

    test('should not throw error when called outside context', () => {
      expect(() => {
        tryGetCurrentRequest()
      }).not.toThrow()
    })
  })

  describe('Server Action Use Cases', () => {
    test('should allow server actions to access request context', async () => {
      const request = createMockRequest('/api/users')
      request.setPathParam('userId', '456')

      // Simulate a server action that needs request context
      const serverAction = async (data: any) => {
        const req = useCurrentRequest()
        return {
          userId: req.pathParam('userId'),
          ip: req.ip(),
          path: req.path(),
          data
        }
      }

      const result = await runWithRequestContext(request, async () => {
        return await serverAction({ name: 'Test' })
      })

      expect(result).toEqual({
        userId: '456',
        ip: '127.0.0.1',
        path: '/api/users',
        data: { name: 'Test' }
      })
    })

    test('should support authentication checks in server actions', async () => {
      // Create request with cookie header
      const request = createMockRequest('/test', 'auth-token=secret-token-123')

      const authenticatedAction = async () => {
        const req = useCurrentRequest()
        const token = req.cookies().get('auth-token')

        if (!token) {
          throw new Error('Unauthorized')
        }

        return { authenticated: true, token }
      }

      const result = await runWithRequestContext(request, authenticatedAction)

      expect(result).toEqual({
        authenticated: true,
        token: 'secret-token-123'
      })
    })

    test('should support accessing request headers in server actions', () => {
      const request = createMockRequest()

      runWithRequestContext(request, () => {
        const req = useCurrentRequest()
        const userAgent = req.requestHeader('user-agent')
        expect(userAgent).toBe('test-agent')
      })
    })
  })

  describe('Async Local Storage Behavior', () => {
    test('should maintain context across async operations', async () => {
      const request = createMockRequest('/async-test')

      await runWithRequestContext(request, async () => {
        expect(useCurrentRequest().path()).toBe('/async-test')

        await new Promise(resolve => setTimeout(resolve, 10))
        expect(useCurrentRequest().path()).toBe('/async-test')

        await Promise.resolve()
        expect(useCurrentRequest().path()).toBe('/async-test')
      })
    })

    test('should maintain context across Promise chains', async () => {
      const request = createMockRequest('/promise-chain')

      await runWithRequestContext(request, () => {
        return Promise.resolve()
          .then(() => {
            expect(useCurrentRequest().path()).toBe('/promise-chain')
          })
          .then(() => {
            expect(useCurrentRequest().path()).toBe('/promise-chain')
          })
      })
    })

    test('should maintain separate contexts in parallel requests', async () => {
      const request1 = createMockRequest('/request1')
      const request2 = createMockRequest('/request2')

      const promise1 = runWithRequestContext(request1, async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return useCurrentRequest().path()
      })

      const promise2 = runWithRequestContext(request2, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return useCurrentRequest().path()
      })

      const [path1, path2] = await Promise.all([promise1, promise2])

      expect(path1).toBe('/request1')
      expect(path2).toBe('/request2')
    })
  })
})

// Helper function to create a mock request
function createMockRequest(path: string = '/test', cookieHeader?: string): PeaqueRequest {
  const request = new PeaqueRequestImpl(
    null, // body
    {}, // params
    {}, // query
    { 'user-agent': 'test-agent' }, // headers
    'GET', // method
    path, // path
    path, // originalUrl
    '127.0.0.1', // ip
    cookieHeader, // cookie header
    undefined // raw body
  )
  return request
}
