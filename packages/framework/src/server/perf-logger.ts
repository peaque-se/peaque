/// Performance logging utility for debugging dev server performance
/// © Peaque Developers 2025

import colors from "yoctocolors"

interface PerfMeasurement {
  label: string
  start: number
  end?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceLogger {
  private enabled = process.env.PEAQUE_PERF_LOG === "true"
  private measurements: Map<string, PerfMeasurement> = new Map()
  private threshold = 10 // Only log operations taking more than 10ms

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  setThreshold(ms: number) {
    this.threshold = ms
  }

  start(label: string, metadata?: Record<string, any>): string {
    if (!this.enabled) return label

    const key = `${label}_${Date.now()}_${Math.random()}`
    this.measurements.set(key, {
      label,
      start: performance.now(),
      metadata
    })
    return key
  }

  end(key: string, additionalMetadata?: Record<string, any>) {
    if (!this.enabled) return

    const measurement = this.measurements.get(key)
    if (!measurement) return

    measurement.end = performance.now()
    measurement.duration = measurement.end - measurement.start

    if (additionalMetadata) {
      measurement.metadata = { ...measurement.metadata, ...additionalMetadata }
    }

    // Only log if above threshold
    if (measurement.duration >= this.threshold) {
      this.log(measurement)
    }

    this.measurements.delete(key)
  }

  measure<T>(label: string, fn: () => T, metadata?: Record<string, any>): T {
    const key = this.start(label, metadata)
    try {
      const result = fn()
      this.end(key)
      return result
    } catch (error) {
      this.end(key, { error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const key = this.start(label, metadata)
    try {
      const result = await fn()
      this.end(key)
      return result
    } catch (error) {
      this.end(key, { error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  private log(measurement: PerfMeasurement) {
    const duration = measurement.duration!.toFixed(2)
    const color = this.getColorForDuration(measurement.duration!)

    let message = `[PERF] ${measurement.label}: ${color(duration + "ms")}`

    if (measurement.metadata && Object.keys(measurement.metadata).length > 0) {
      const metaStr = Object.entries(measurement.metadata)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
      message += colors.gray(` (${metaStr})`)
    }

    console.log(message)
  }

  private getColorForDuration(duration: number): (str: string) => string {
    if (duration < 50) return colors.green
    if (duration < 200) return colors.yellow
    if (duration < 500) return colors.magenta
    return colors.red
  }

  // Request-level timing helper
  logRequest(method: string, path: string, duration: number, statusCode: number) {
    if (!this.enabled || duration < this.threshold) return

    const color = this.getColorForDuration(duration)
    const statusColor = statusCode < 400 ? colors.green : colors.red

    console.log(
      `[PERF] ${colors.bold("Request")} ${method} ${path}: ${color(duration.toFixed(2) + "ms")} ${statusColor(`[${statusCode}]`)}`
    )
  }

  // Summary statistics
  getSummary(): string {
    return `Active measurements: ${this.measurements.size}`
  }
}

export const perfLogger = new PerformanceLogger()

// Note: Performance logging is enabled after .env files are loaded in the DevServer constructor
// This allows PEAQUE_PERF_LOG to be set in .env or .env.local files
