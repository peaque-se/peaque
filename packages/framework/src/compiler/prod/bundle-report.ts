import path from "path"
import colors from "yoctocolors"
import type { FrontendBuildResult } from "../frontend-bundler.js"

interface PackageSize {
  file: string
  size: number
}

export function reportBundleAnalysis(result: FrontendBuildResult, basePath: string): void {
  const inputs = result.metafile?.inputs
  if (!inputs) {
    return
  }

  console.log(`\n📊  ${colors.bold(colors.yellow("Bundle Analysis"))}`)
  console.log(`     ${colors.gray("─".repeat(80))}`)

  const packageSizes = new Map<string, number>()
  const fileSizes: PackageSize[] = []
  const projectFiles: PackageSize[] = []

  for (const [inputPath, inputInfo] of Object.entries(inputs)) {
    const size = inputInfo.bytes || 0
    fileSizes.push({ file: inputPath, size })

    if (inputPath.includes("node_modules")) {
      const match = inputPath.match(/node_modules[\/\\](@?[^\/\\]+(?:[\/\\][^\/\\]+)?)/)
      if (match) {
        const packageName = match[1]
        packageSizes.set(packageName, (packageSizes.get(packageName) || 0) + size)
      }
    } else {
      packageSizes.set("[project files]", (packageSizes.get("[project files]") || 0) + size)
      projectFiles.push({ file: inputPath, size })
    }
  }

  const sortedPackages = Array.from(packageSizes.entries()).sort((a, b) => b[1] - a[1])
  const sortedProjectFiles = projectFiles.sort((a, b) => b.size - a.size)
  const totalSize = sortedPackages.reduce((sum, [, size]) => sum + size, 0)

  console.log(`\n     ${colors.bold("Top packages by size:")}`)
  for (const [pkg, size] of sortedPackages.slice(0, 15)) {
    const percentage = totalSize > 0 ? ((size / totalSize) * 100).toFixed(1) : "0.0"
    const sizeKB = (size / 1024).toFixed(2)
    const barLength = Math.max(1, Math.ceil(parseFloat(percentage) / 2))
    const bar = "█".repeat(barLength)
    console.log(`     ${colors.cyan(pkg.padEnd(40))} ${colors.yellow(sizeKB.padStart(8))} KB  ${colors.gray(percentage.padStart(5))}%  ${colors.green(bar)}`)
  }

  if (sortedPackages.length > 15) {
    console.log(`     ${colors.gray(`... and ${sortedPackages.length - 15} more packages`)}`)
  }

  if (sortedProjectFiles.length > 0) {
    console.log(`\n     ${colors.bold("Largest project files:")}`)
    for (const { file, size } of sortedProjectFiles.slice(0, 10)) {
      const sizeKB = (size / 1024).toFixed(2)
      const relativePath = path.relative(basePath, file).replace(/\\/g, "/")
      console.log(`     ${colors.cyan(relativePath.padEnd(50))} ${colors.yellow(sizeKB.padStart(8))} KB`)
    }

    if (sortedProjectFiles.length > 10) {
      console.log(`     ${colors.gray(`... and ${sortedProjectFiles.length - 10} more files`)}`)
    }
  }

  console.log(`\n     ${colors.bold("Total input size:")} ${colors.yellow((totalSize / 1024).toFixed(2))} KB`)
  console.log(`     ${colors.gray("─".repeat(80))}\n`)
}
