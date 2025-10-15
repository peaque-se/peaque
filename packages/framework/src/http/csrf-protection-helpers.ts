import { PeaqueRequest } from "./http-types.js"

/**
 * Check if a request passes CSRF protection checks.
 * This implements the same logic as CrossOriginProtection but returns a boolean
 * instead of calling next() or responding, making it suitable for non-middleware usage.
 *
 * This follows the Go-lang CrossOriginProtection approach:
 * 1. Safe methods (GET, HEAD, OPTIONS) are always allowed
 * 2. Check Sec-Fetch-Site header:
 *    - "same-origin" or "none" → allow
 *    - Any other value → reject
 * 3. Check Origin header (fallback for older browsers):
 *    - No Origin header → allow (assumed same-origin or non-browser)
 *    - Origin matches Host → allow
 *    - Otherwise → reject
 *
 * @param req The request to check
 * @returns true if the request passes CSRF checks, false otherwise
 */
export function checkCsrfProtection(req: PeaqueRequest): boolean {
  // Safe methods are always allowed (GET, HEAD, OPTIONS)
  const method = req.method()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true
  }

  // Check Sec-Fetch-Site header first (modern browsers)
  const secFetchSite = req.requestHeader("sec-fetch-site")
  if (secFetchSite !== undefined && secFetchSite !== "") {
    // "same-origin" or "none" are acceptable
    if (secFetchSite === "same-origin" || secFetchSite === "none") {
      return true
    }
    // For any other value (like "cross-site", "same-site"), reject
    return false
  }

  // No Sec-Fetch-Site header is present, check the Origin header
  const origin = req.requestHeader("origin")
  if (origin === undefined || origin === "") {
    // Neither Sec-Fetch-Site nor Origin headers are present.
    // Either the request is same-origin or not a browser request.
    return true
  }

  // Parse origin and compare with Host header
  const originHost = extractHost(origin)
  if (originHost === null) {
    // Malformed origin header
    return false
  }

  const host = req.requestHeader("host")
  if (originHost === host) {
    // The Origin header matches the Host header. Note that the Host header
    // doesn't include the scheme, so we don't know if this might be an
    // HTTP→HTTPS cross-origin request. We fail open, since all modern
    // browsers support Sec-Fetch-Site since 2023, and running an older
    // browser makes a clear security trade-off already. Sites can mitigate
    // this with HTTP Strict Transport Security (HSTS).
    return true
  }

  // Origin doesn't match Host
  return false
}

/**
 * Extract host (hostname:port) from an origin URL.
 * This matches Go's url.Parse(origin).Host behavior.
 * e.g., "https://example.com:8080" -> "example.com:8080"
 * e.g., "https://example.com" -> "example.com"
 */
function extractHost(origin: string): string | null {
  try {
    const url = new URL(origin)
    // url.host includes the port if present, matching Go's behavior
    return url.host
  } catch {
    return null
  }
}
