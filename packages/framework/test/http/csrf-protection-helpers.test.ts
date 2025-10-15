import { checkCsrfProtection } from "../../src/http/csrf-protection-helpers.js"
import { HttpMethod, PeaqueRequest } from "../../src/http/http-types.js"
import { describe, test, expect, jest } from '@jest/globals'

// Mock PeaqueRequest implementation for testing
class MockPeaqueRequest implements PeaqueRequest {
  private _path: string
  private _method: HttpMethod
  private _pathParams: Record<string, string> = {}
  private _queryParams: Record<string, string[]> = {}
  private _headers: Record<string, string[]> = {}
  private _body: any = null
  private _responded = false
  private _responseCode = 200
  private _responseBody: any = null
  private _originalUrl = ""
  private _ip = "127.0.0.1"
  private _cookies: any = {
    get: jest.fn(),
    getAll: jest.fn(),
    set: jest.fn(),
    remove: jest.fn()
  }

  constructor(path: string = "/", method: HttpMethod = "GET") {
    this._path = path
    this._method = method
    this._originalUrl = path
  }

  body<T = any>(): T {
    return this._body as T
  }

  rawBody(): Buffer | undefined {
    return undefined
  }

  isResponded(): boolean {
    return this._responded
  }

  path(): string {
    return this._path
  }

  setPath(path: string): void {
    this._path = path
  }

  param(name: string): string | undefined {
    return this._pathParams[name] || this._queryParams[name]?.[0]
  }

  paramNames(): string[] {
    return [...Object.keys(this._pathParams), ...Object.keys(this._queryParams)]
  }

  pathParam(name: string): string | undefined {
    return this._pathParams[name]
  }

  setPathParam(name: string, value: string): void {
    this._pathParams[name] = value
  }

  queryParam(name: string): string | undefined {
    return this._queryParams[name]?.[0]
  }

  queryString(): string {
    const params = Object.entries(this._queryParams)
      .flatMap(([key, values]) => values.map(v => `${key}=${v}`))
      .join('&')
    return params ? `?${params}` : ''
  }

  setQueryParam(name: string, value: string[]): void {
    this._queryParams[name] = value
  }

  queryParamValues(name: string): string[] | undefined {
    return this._queryParams[name]
  }

  requestHeader(name: string): string | undefined {
    return this._headers[name.toLowerCase()]?.[0]
  }

  requestHeaderValues(name: string): string[] | undefined {
    return this._headers[name.toLowerCase()]
  }

  method(): HttpMethod {
    return this._method
  }

  originalUrl(): string {
    return this._originalUrl
  }

  ip(): string {
    return this._ip
  }

  cookies(): any {
    return this._cookies
  }

  code(statusCode: number): PeaqueRequest {
    this._responseCode = statusCode
    return this
  }

  header(name: string, value: string): PeaqueRequest {
    this._headers[name.toLowerCase()] = [value]
    return this
  }

  responseHeader(name: string): string | undefined {
    return this._headers[name.toLowerCase()]?.[0]
  }

  type(contentType: string): PeaqueRequest {
    return this.header("content-type", contentType)
  }

  send<T = any>(data?: T): void {
    this._responseBody = data
    this._responded = true
  }

  redirect(url: string, code: number = 302): void {
    this._responseCode = code
    this._responseBody = url
    this._responded = true
  }

  responseCode(): number {
    return this._responseCode
  }

  responseBody(): any {
    return this._responseBody
  }

  isUpgradeRequest(): boolean {
    return false
  }

  upgradeToWebSocket(handler: any): any {
    throw new Error("WebSocket upgrade not implemented in mock")
  }

  async proxyTo(url: string): Promise<void> {
    throw new Error("Proxy not implemented in mock")
  }

  // Helper methods for testing
  setHeader(name: string, value: string): void {
    this._headers[name.toLowerCase()] = [value]
  }

  setHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([name, value]) => {
      this._headers[name.toLowerCase()] = [value]
    })
  }
}

describe('checkCsrfProtection - Helper Function Tests', () => {
  describe('Safe Methods', () => {
    test('should allow GET requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "GET")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should allow HEAD requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "HEAD")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should allow OPTIONS requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "OPTIONS")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should allow GET requests even with cross-site header', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "GET")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://malicious.com")
      expect(checkCsrfProtection(req)).toBe(true)
    })
  })

  describe('Sec-Fetch-Site Header', () => {
    test('should allow same-origin POST requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("sec-fetch-site", "same-origin")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should allow non-browser POST requests (none)', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("sec-fetch-site", "none")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should reject same-site POST requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("sec-fetch-site", "same-site")
      expect(checkCsrfProtection(req)).toBe(false)
    })

    test('should reject cross-site POST requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      expect(checkCsrfProtection(req)).toBe(false)
    })
  })

  describe('Origin Header Fallback', () => {
    test('should allow POST without any headers (non-browser)', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should allow POST with matching origin and host', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "https://example.com")
      req.setHeader("host", "example.com")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should allow POST with matching origin and host (with port)', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "https://example.com:8080")
      req.setHeader("host", "example.com:8080")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should reject POST with mismatched origin and host', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "https://malicious.com")
      req.setHeader("host", "example.com")
      expect(checkCsrfProtection(req)).toBe(false)
    })

    test('should reject POST with invalid origin', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "not-a-valid-url")
      req.setHeader("host", "example.com")
      expect(checkCsrfProtection(req)).toBe(false)
    })

    test('should handle localhost correctly', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "http://localhost:3000")
      req.setHeader("host", "localhost:3000")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should handle different ports as mismatched', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "http://example.com:3000")
      req.setHeader("host", "example.com:8080")
      expect(checkCsrfProtection(req)).toBe(false)
    })
  })

  describe('RPC Specific Scenarios', () => {
    test('should allow legitimate RPC call from same origin', () => {
      const req = new MockPeaqueRequest("/api/__rpc/src/actions/updateUser", "POST")
      req.setHeader("sec-fetch-site", "same-origin")
      req.setHeader("host", "example.com")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should reject malicious RPC call from different origin', () => {
      const req = new MockPeaqueRequest("/api/__rpc/src/actions/updateUser", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://evil.com")
      req.setHeader("host", "example.com")
      expect(checkCsrfProtection(req)).toBe(false)
    })

    test('should allow RPC calls from API clients without browser headers', () => {
      const req = new MockPeaqueRequest("/api/__rpc/src/actions/getData", "POST")
      // No Sec-Fetch-Site or Origin headers (typical for non-browser clients)
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should allow RPC calls from mobile apps or desktop apps', () => {
      const req = new MockPeaqueRequest("/api/__rpc/src/actions/sync", "POST")
      req.setHeader("sec-fetch-site", "none")
      expect(checkCsrfProtection(req)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty Sec-Fetch-Site header', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("sec-fetch-site", "")
      // Should fallback to Origin check
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should handle empty Origin header', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should handle case-insensitive headers', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("Sec-Fetch-Site", "same-origin")
      expect(checkCsrfProtection(req)).toBe(true)
    })

    test('should handle missing Host header with Origin present', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("origin", "https://example.com")
      // No Host header - should fail safe by rejecting
      expect(checkCsrfProtection(req)).toBe(false)
    })
  })

  describe('All HTTP Methods', () => {
    test('should protect POST requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      expect(checkCsrfProtection(req)).toBe(false)
    })

    test('should protect PUT requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "PUT")
      req.setHeader("sec-fetch-site", "cross-site")
      expect(checkCsrfProtection(req)).toBe(false)
    })

    test('should protect DELETE requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "DELETE")
      req.setHeader("sec-fetch-site", "cross-site")
      expect(checkCsrfProtection(req)).toBe(false)
    })

    test('should protect PATCH requests', () => {
      const req = new MockPeaqueRequest("/api/__rpc/test", "PATCH")
      req.setHeader("sec-fetch-site", "cross-site")
      expect(checkCsrfProtection(req)).toBe(false)
    })
  })
})
