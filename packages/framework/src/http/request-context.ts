import { AsyncLocalStorage } from "async_hooks"
import type { PeaqueRequest } from "./http-types.js"

/**
 * AsyncLocalStorage instance for storing the current request context
 */
const requestContext = new AsyncLocalStorage<PeaqueRequest>()

/**
 * Run a function with the given request in the async local storage context
 * @param request The PeaqueRequest to store in context
 * @param fn The function to execute with the request context
 * @returns The result of the function
 */
export function runWithRequestContext<T>(request: PeaqueRequest, fn: () => T | Promise<T>): T | Promise<T> {
  return requestContext.run(request, fn)
}

/**
 * Get the current PeaqueRequest from the async local storage context
 * @returns The current PeaqueRequest or undefined if not in a request context
 * @throws Error if called outside of a request context
 */
export function useCurrentRequest(): PeaqueRequest {
  const request = requestContext.getStore()
  if (!request) {
    throw new Error("useCurrentRequest() can only be called within a request context (e.g., in server actions, API routes, or middleware)")
  }
  return request
}

/**
 * Get the current PeaqueRequest from the async local storage context, or undefined if not available
 * @returns The current PeaqueRequest or undefined if not in a request context
 */
export function tryGetCurrentRequest(): PeaqueRequest | undefined {
  return requestContext.getStore()
}
