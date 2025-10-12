import { describe, test, expect } from '@jest/globals'
import { matchPath, findMatch } from '../../src/client/client-router.js'
import { RouteNode } from '../../src/router/router.js'

describe('client-router.tsx', () => {
  describe('matchPath', () => {
    test('should match exact static paths', () => {
      const params = matchPath('/users', '/users')
      expect(params).toEqual({}) // no params
    })

    test('should extract params from dynamic paths', () => {
      const params = matchPath('/users/:id', '/users/123')
      expect(params).toEqual({ id: '123' })
    })

    test('should return null for mismatched lengths', () => {
      const params = matchPath('/users/:id', '/users/123/posts')
      expect(params).toBeNull()
    })

    test('should return null for non-matching static parts', () => {
      const params = matchPath('/users/:id', '/posts/123')
      expect(params).toBeNull()
    })

    test('should handle multiple params', () => {
      const params = matchPath('/users/:userId/posts/:postId', '/users/123/posts/456')
      expect(params).toEqual({ userId: '123', postId: '456' })
    })
  })

  describe('findMatch', () => {
    test('should find match for root route', () => {
      const root: RouteNode = {
        staticChildren: new Map(),
        names: { page: 'PageComponent' as any },
        stacks: {},
        accept: true
      }
      const result = findMatch(root, '/')
      expect(result).toEqual({
        component: 'PageComponent',
        pattern: '/',
        layouts: [],
        params: {},
        guards: [],
        middleware: [],
        heads: []
      })
    })

    test('should return null for no match', () => {
      const root: RouteNode = {
        staticChildren: new Map(),
        names: { page: 'PageComponent' as any },
        stacks: {},
        accept: true
      }
      const result = findMatch(root, '/nonexistent')
      expect(result).toBeNull()
    })
  })
})