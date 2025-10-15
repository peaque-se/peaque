import { CrossOriginProtection, createCrossOriginProtection } from "../../src/http/cross-origin-protection.js"
import { HttpMethod, PeaqueRequest, RequestHandler } from "../../src/http/http-types.js"
import { describe, test, expect, beforeEach, jest } from '@jest/globals'

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

  resetResponse(): void {
    this._responded = false
    this._responseCode = 200
    this._responseBody = null
  }
}

describe('CrossOriginProtection - CSRF Protection Tests', () => {
  let protection: CrossOriginProtection
  let mockNext: jest.MockedFunction<RequestHandler>

  beforeEach(() => {
    protection = new CrossOriginProtection()
    mockNext = jest.fn()
  })

  describe('Safe Methods (GET, HEAD, OPTIONS)', () => {
    test('should allow GET requests without any headers', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/data", "GET")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow HEAD requests without any headers', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/data", "HEAD")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow OPTIONS requests without any headers', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/data", "OPTIONS")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow safe methods even with cross-site Sec-Fetch-Site', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/data", "GET")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://malicious.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })
  })

  describe('Sec-Fetch-Site Header Detection', () => {
    test('should allow same-origin requests (Sec-Fetch-Site: same-origin)', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("sec-fetch-site", "same-origin")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow non-browser requests (Sec-Fetch-Site: none)', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("sec-fetch-site", "none")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should reject same-site requests (Sec-Fetch-Site: same-site)', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("sec-fetch-site", "same-site")

      await middleware(req, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(req.isResponded()).toBe(true)
      expect(req.responseCode()).toBe(403)
      expect(req.responseBody()).toEqual({ error: "Forbidden: Cross-origin request rejected" })
    })

    test('should reject cross-site requests (Sec-Fetch-Site: cross-site)', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://malicious.com")

      await middleware(req, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(req.isResponded()).toBe(true)
      expect(req.responseCode()).toBe(403)
      expect(req.responseBody()).toEqual({ error: "Forbidden: Cross-origin request rejected" })
    })

    test('should allow cross-site requests from trusted origins', async () => {
      protection.addTrustedOrigin("https://trusted-site.com")
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://trusted-site.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should reject cross-site requests without origin header', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("sec-fetch-site", "cross-site")

      await middleware(req, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(req.isResponded()).toBe(true)
      expect(req.responseCode()).toBe(403)
    })

    test('should allow same-site requests with bypass pattern', async () => {
      protection.addBypassPattern(/^\/api\/webhook/)
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/webhook/handler", "POST")
      req.setHeader("sec-fetch-site", "same-site")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })
  })

  describe('Origin Header Fallback', () => {
    test('should allow requests with matching Origin and Host', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "https://example.com")
      req.setHeader("host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow requests with matching Origin and Host (with port)', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "https://example.com:8080")
      req.setHeader("host", "example.com:8080")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should reject requests with mismatched Origin and Host', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "https://malicious.com")
      req.setHeader("host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(req.isResponded()).toBe(true)
      expect(req.responseCode()).toBe(403)
      expect(req.responseBody()).toEqual({ error: "Forbidden: Cross-origin request rejected from older browser" })
    })

    test('should reject requests with invalid origin header', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "not-a-valid-url")
      req.setHeader("host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(req.isResponded()).toBe(true)
      expect(req.responseCode()).toBe(403)
      expect(req.responseBody()).toEqual({ error: "Forbidden: Invalid origin header" })
    })

    test('should allow requests from trusted origin even with mismatched host', async () => {
      protection.addTrustedOrigin("https://trusted-site.com")
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "https://trusted-site.com")
      req.setHeader("host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow invalid origin header with bypass pattern', async () => {
      protection.addBypassPattern(/^\/api\/webhook/)
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/webhook/handler", "POST")
      req.setHeader("origin", "not-a-valid-url")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })
  })

  describe('No Headers (Non-Browser Requests)', () => {
    test('should allow POST requests without Sec-Fetch-Site or Origin headers', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow PUT requests without headers', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "PUT")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow DELETE requests without headers', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "DELETE")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should allow PATCH requests without headers', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "PATCH")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })
  })

  describe('Trusted Origins Configuration', () => {
    test('should add single trusted origin', () => {
      const result = protection.addTrustedOrigin("https://trusted.com")
      expect(result).toBe(protection) // Should return this for chaining
    })

    test('should add multiple trusted origins', () => {
      const result = protection.addTrustedOrigins([
        "https://trusted1.com",
        "https://trusted2.com",
        "https://trusted3.com"
      ])
      expect(result).toBe(protection)
    })

    test('should allow requests from multiple trusted origins', async () => {
      protection.addTrustedOrigins([
        "https://trusted1.com",
        "https://trusted2.com"
      ])
      const middleware = protection.getMiddleware()

      const req1 = new MockPeaqueRequest("/api/action", "POST")
      req1.setHeader("sec-fetch-site", "cross-site")
      req1.setHeader("origin", "https://trusted1.com")

      const req2 = new MockPeaqueRequest("/api/action", "POST")
      req2.setHeader("sec-fetch-site", "cross-site")
      req2.setHeader("origin", "https://trusted2.com")

      await middleware(req1, mockNext)
      expect(mockNext).toHaveBeenCalledWith(req1)
      expect(req1.isResponded()).toBe(false)

      mockNext.mockClear()

      await middleware(req2, mockNext)
      expect(mockNext).toHaveBeenCalledWith(req2)
      expect(req2.isResponded()).toBe(false)
    })
  })

  describe('Bypass Patterns Configuration', () => {
    test('should add single bypass pattern', () => {
      const result = protection.addBypassPattern(/^\/webhook/)
      expect(result).toBe(protection)
    })

    test('should add multiple bypass patterns', () => {
      const result = protection.addBypassPatterns([
        /^\/webhook/,
        /^\/public/
      ])
      expect(result).toBe(protection)
    })

    test('should bypass CSRF check for matching paths', async () => {
      protection.addBypassPattern(/^\/api\/webhook/)
      const middleware = protection.getMiddleware()

      const req = new MockPeaqueRequest("/api/webhook/github", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://github.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should not bypass CSRF check for non-matching paths', async () => {
      protection.addBypassPattern(/^\/api\/webhook/)
      const middleware = protection.getMiddleware()

      const req = new MockPeaqueRequest("/api/users", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://malicious.com")

      await middleware(req, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(req.isResponded()).toBe(true)
      expect(req.responseCode()).toBe(403)
    })

    test('should support multiple bypass patterns', async () => {
      protection.addBypassPatterns([
        /^\/webhook/,
        /^\/public/
      ])
      const middleware = protection.getMiddleware()

      const req1 = new MockPeaqueRequest("/webhook/handler", "POST")
      req1.setHeader("sec-fetch-site", "cross-site")

      const req2 = new MockPeaqueRequest("/public/api", "POST")
      req2.setHeader("sec-fetch-site", "cross-site")

      await middleware(req1, mockNext)
      expect(mockNext).toHaveBeenCalledWith(req1)
      expect(req1.isResponded()).toBe(false)

      mockNext.mockClear()

      await middleware(req2, mockNext)
      expect(mockNext).toHaveBeenCalledWith(req2)
      expect(req2.isResponded()).toBe(false)
    })
  })

  describe('createCrossOriginProtection Factory Function', () => {
    test('should create instance with no config', () => {
      const instance = createCrossOriginProtection()
      expect(instance).toBeInstanceOf(CrossOriginProtection)
    })

    test('should create instance with trusted origins', async () => {
      const instance = createCrossOriginProtection({
        trustedOrigins: ["https://trusted.com"]
      })

      const middleware = instance.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("sec-fetch-site", "cross-site")
      req.setHeader("origin", "https://trusted.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should create instance with bypass patterns', async () => {
      const instance = createCrossOriginProtection({
        bypassPatterns: [/^\/webhook/]
      })

      const middleware = instance.getMiddleware()
      const req = new MockPeaqueRequest("/webhook/handler", "POST")
      req.setHeader("sec-fetch-site", "cross-site")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should create instance with both trusted origins and bypass patterns', async () => {
      const instance = createCrossOriginProtection({
        trustedOrigins: ["https://trusted.com"],
        bypassPatterns: [/^\/webhook/]
      })

      const middleware = instance.getMiddleware()

      // Test trusted origin
      const req1 = new MockPeaqueRequest("/api/action", "POST")
      req1.setHeader("sec-fetch-site", "cross-site")
      req1.setHeader("origin", "https://trusted.com")

      await middleware(req1, mockNext)
      expect(mockNext).toHaveBeenCalledWith(req1)
      expect(req1.isResponded()).toBe(false)

      mockNext.mockClear()

      // Test bypass pattern
      const req2 = new MockPeaqueRequest("/webhook/handler", "POST")
      req2.setHeader("sec-fetch-site", "cross-site")

      await middleware(req2, mockNext)
      expect(mockNext).toHaveBeenCalledWith(req2)
      expect(req2.isResponded()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    test('should handle case-insensitive header names', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("Sec-Fetch-Site", "same-origin")
      req.setHeader("Origin", "https://example.com")
      req.setHeader("Host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should handle origin with different ports correctly', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "https://example.com:3000")
      req.setHeader("host", "example.com:8080")

      await middleware(req, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(req.isResponded()).toBe(true)
      expect(req.responseCode()).toBe(403)
      expect(req.responseBody()).toEqual({ error: "Forbidden: Cross-origin request rejected from older browser" })
    })

    test('should handle origin with https and http schemes correctly', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "http://example.com")
      req.setHeader("host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should handle origin with default https port (443)', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "https://example.com")
      req.setHeader("host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should handle origin with default http port (80)', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "http://example.com")
      req.setHeader("host", "example.com")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should handle localhost correctly', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "http://localhost:3000")
      req.setHeader("host", "localhost:3000")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })

    test('should handle IP addresses correctly', async () => {
      const middleware = protection.getMiddleware()
      const req = new MockPeaqueRequest("/api/action", "POST")
      req.setHeader("origin", "http://192.168.1.1:8080")
      req.setHeader("host", "192.168.1.1:8080")

      await middleware(req, mockNext)

      expect(mockNext).toHaveBeenCalledWith(req)
      expect(req.isResponded()).toBe(false)
    })
  })

  describe('Integration Scenarios', () => {
    test('should protect a typical API endpoint', async () => {
      const middleware = protection.getMiddleware()

      // Legitimate same-origin POST
      const legitReq = new MockPeaqueRequest("/api/user/update", "POST")
      legitReq.setHeader("sec-fetch-site", "same-origin")

      await middleware(legitReq, mockNext)
      expect(mockNext).toHaveBeenCalledWith(legitReq)
      expect(legitReq.isResponded()).toBe(false)

      mockNext.mockClear()

      // Malicious cross-site POST
      const maliciousReq = new MockPeaqueRequest("/api/user/update", "POST")
      maliciousReq.setHeader("sec-fetch-site", "cross-site")
      maliciousReq.setHeader("origin", "https://evil.com")

      await middleware(maliciousReq, mockNext)
      expect(mockNext).not.toHaveBeenCalled()
      expect(maliciousReq.isResponded()).toBe(true)
      expect(maliciousReq.responseCode()).toBe(403)
    })

    test('should allow webhook endpoints with bypass pattern', async () => {
      protection.addBypassPattern(/^\/api\/webhooks\//)
      const middleware = protection.getMiddleware()

      // GitHub webhook
      const webhookReq = new MockPeaqueRequest("/api/webhooks/github", "POST")
      webhookReq.setHeader("origin", "https://github.com")

      await middleware(webhookReq, mockNext)
      expect(mockNext).toHaveBeenCalledWith(webhookReq)
      expect(webhookReq.isResponded()).toBe(false)

      mockNext.mockClear()

      // Regular API endpoint should still be protected
      const apiReq = new MockPeaqueRequest("/api/user/delete", "POST")
      apiReq.setHeader("sec-fetch-site", "cross-site")

      await middleware(apiReq, mockNext)
      expect(mockNext).not.toHaveBeenCalled()
      expect(apiReq.isResponded()).toBe(true)
    })

    test('should support trusted mobile app origins', async () => {
      protection.addTrustedOrigin("app://mobile-app")
      const middleware = protection.getMiddleware()

      const mobileReq = new MockPeaqueRequest("/api/data", "POST")
      mobileReq.setHeader("sec-fetch-site", "cross-site")
      mobileReq.setHeader("origin", "app://mobile-app")

      await middleware(mobileReq, mockNext)
      expect(mockNext).toHaveBeenCalledWith(mobileReq)
      expect(mobileReq.isResponded()).toBe(false)
    })
  })
})
