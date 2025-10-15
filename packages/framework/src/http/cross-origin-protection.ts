import { RequestMiddleware, PeaqueRequest, RequestHandler } from "./http-types.js"

export class CrossOriginProtection {
  private trustedOrigins: Set<string> = new Set()
  private bypassPatterns: RegExp[] = []

  addTrustedOrigin(origin: string): this {
    this.trustedOrigins.add(origin)
    return this
  }

  addTrustedOrigins(origins: string[]): this {
    origins.forEach(origin => this.trustedOrigins.add(origin))
    return this
  }

  addBypassPattern(pattern: RegExp): this {
    this.bypassPatterns.push(pattern)
    return this
  }

  addBypassPatterns(patterns: RegExp[]): this {
    this.bypassPatterns.push(...patterns)
    return this
  }

  getMiddleware(): RequestMiddleware {
    return async (req: PeaqueRequest, next: RequestHandler): Promise<void> => {
      // Safe methods are always allowed (GET, HEAD, OPTIONS)
      const method = req.method()
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        await next(req)
        return
      }

      // Check Sec-Fetch-Site header first (modern browsers)
      const secFetchSite = req.requestHeader("sec-fetch-site")
      if (secFetchSite !== undefined && secFetchSite !== "") {
        // "same-origin" or "none" are acceptable
        if (secFetchSite === "same-origin" || secFetchSite === "none") {
          await next(req)
          return
        }
        // For any other value (like "cross-site", "same-site"), check if request is exempt
        if (this.isRequestExempt(req)) {
          await next(req)
          return
        }
        req.code(403).send({ error: "Forbidden: Cross-origin request rejected" })
        return
      }

      // No Sec-Fetch-Site header is present, check the Origin header
      const origin = req.requestHeader("origin")
      if (origin === undefined || origin === "") {
        // Neither Sec-Fetch-Site nor Origin headers are present.
        // Either the request is same-origin or not a browser request.
        await next(req)
        return
      }

      // Parse origin and compare with Host header
      const originHost = this.extractHost(origin)
      if (originHost === null) {
        // Malformed origin header
        if (this.isRequestExempt(req)) {
          await next(req)
          return
        }
        req.code(403).send({ error: "Forbidden: Invalid origin header" })
        return
      }

      const host = req.requestHeader("host")
      if (originHost === host) {
        // The Origin header matches the Host header. Note that the Host header
        // doesn't include the scheme, so we don't know if this might be an
        // HTTP→HTTPS cross-origin request. We fail open, since all modern
        // browsers support Sec-Fetch-Site since 2023, and running an older
        // browser makes a clear security trade-off already. Sites can mitigate
        // this with HTTP Strict Transport Security (HSTS).
        await next(req)
        return
      }

      // Origin doesn't match Host
      if (this.isRequestExempt(req)) {
        await next(req)
        return
      }
      req.code(403).send({ error: "Forbidden: Cross-origin request rejected from older browser" })
    }
  }

  private isRequestExempt(req: PeaqueRequest): boolean {
    // Check if path matches any bypass pattern
    const path = req.path()
    if (this.bypassPatterns.some(pattern => pattern.test(path))) {
      return true
    }

    // Check if origin is in trusted list
    const origin = req.requestHeader("origin")
    if (origin && this.trustedOrigins.has(origin)) {
      return true
    }

    return false
  }

  private extractHost(origin: string): string | null {
    try {
      const url = new URL(origin)
      return url.host
    } catch {
      return null
    }
  }
}

/**
 * Create a new CrossOriginProtection instance with optional configuration.
 *
 * @example
 * ```typescript
 * import { Router } from 'peaque'
 * import { createCrossOriginProtection } from 'peaque'
 *
 * const router = new Router()
 * const csrfProtection = createCrossOriginProtection({
 *   trustedOrigins: ['https://trusted-site.com'],
 *   bypassPatterns: [/^\/api\/webhook/]
 * })
 *
 * // Apply to all routes
 * router.use(csrfProtection.getMiddleware())
 * ```
 */
export function createCrossOriginProtection(config?: {
  trustedOrigins?: string[]
  bypassPatterns?: RegExp[]
}): CrossOriginProtection {
  const protection = new CrossOriginProtection()

  if (config?.trustedOrigins) {
    protection.addTrustedOrigins(config.trustedOrigins)
  }

  if (config?.bypassPatterns) {
    protection.addBypassPatterns(config.bypassPatterns)
  }

  return protection
}
