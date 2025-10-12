import { describe, test, expect } from '@jest/globals'
import { mergeHead, renderHead, type HeadDefinition } from '../../src/client/head.js'

describe('head.ts', () => {
  describe('mergeHead', () => {
    test('should merge titles with child overriding parent', () => {
      const parent: HeadDefinition = { title: 'Parent Title' }
      const child: HeadDefinition = { title: 'Child Title' }
      const result = mergeHead(parent, child)
      expect(result.title).toBe('Child Title')
    })

    test('should keep parent title if child has none', () => {
      const parent: HeadDefinition = { title: 'Parent Title' }
      const child: HeadDefinition = {}
      const result = mergeHead(parent, child)
      expect(result.title).toBe('Parent Title')
    })

    test('should merge meta tags with deduplication', () => {
      const parent: HeadDefinition = {
        meta: [{ name: 'description', content: 'Parent desc' }]
      }
      const child: HeadDefinition = {
        meta: [{ name: 'description', content: 'Child desc' }]
      }
      const result = mergeHead(parent, child)
      expect(result.meta).toEqual([{ name: 'description', content: 'Child desc' }])
    })

    test('should append different meta tags', () => {
      const parent: HeadDefinition = {
        meta: [{ name: 'description', content: 'Desc' }]
      }
      const child: HeadDefinition = {
        meta: [{ name: 'keywords', content: 'Keywords' }]
      }
      const result = mergeHead(parent, child)
      expect(result.meta).toHaveLength(2)
    })
  })

  describe('renderHead', () => {
    test('should render title', () => {
      const head: HeadDefinition = { title: 'Test Title' }
      const result = renderHead(head)
      expect(result).toBe('<title>Test Title</title>')
    })

    test('should render meta tags', () => {
      const head: HeadDefinition = {
        meta: [{ name: 'description', content: 'A description' }]
      }
      const result = renderHead(head)
      expect(result).toBe('<meta name="description" content="A description">')
    })

    test('should escape HTML in content', () => {
      const head: HeadDefinition = {
        title: 'Title with <script>'
      }
      const result = renderHead(head)
      expect(result).toBe('<title>Title with &lt;script&gt;</title>')
    })

    test('should prefix asset URLs', () => {
      const head: HeadDefinition = {
        link: [{ rel: 'stylesheet', href: '/style.css' }]
      }
      const result = renderHead(head, '/assets')
      expect(result).toBe('<link rel="stylesheet" href="/assets/style.css">')
    })
  })
})