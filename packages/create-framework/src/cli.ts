#!/usr/bin/env node

import { confirm, intro, outro, spinner, text, select, note } from "@clack/prompts"
import fs from "fs"
import path from "path"
import child_process from "child_process"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type PackageManager = "npm" | "pnpm" | "yarn"

function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent
  if (userAgent?.startsWith("pnpm")) return "pnpm"
  if (userAgent?.startsWith("yarn")) return "yarn"
  return "npm"
}

function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case "pnpm": return "pnpm install"
    case "yarn": return "yarn install"
    default: return "npm install"
  }
}

function getRunCommand(pm: PackageManager): string {
  switch (pm) {
    case "pnpm": return "pnpm"
    case "yarn": return "yarn"
    default: return "npm run"
  }
}

async function copyProject(templateName: string, projectName: string) {
  const targetDir = path.resolve(process.cwd(), projectName)
  const templateDir = path.resolve(__dirname, `../templates/${templateName}`)

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template "${templateName}" not found`)
  }

  fs.mkdirSync(targetDir, { recursive: true })

  const copy = (src: string, dest: string) => {
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true })
        copy(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
  copy(templateDir, targetDir)

  // Copy .env.example to .env
  const envExamplePath = path.join(targetDir, ".env.example")
  const envPath = path.join(targetDir, ".env")
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath)
  }

  // Update package.json with the actual project name
  const packageJsonPath = path.join(targetDir, "package.json")
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
    packageJson.name = projectName
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
  }
}

async function main() {
  console.clear()

  intro(`🚀 Create Peaque Framework App`)

  // Check if project name was passed as command line argument
  const args = process.argv.slice(2)
  let initialProjectName = "my-peaque-app"

  if (args.length > 0 && !args[0].startsWith("-")) {
    initialProjectName = args[0]
  }

  const projectName = await text({
    message: "Project name:",
    placeholder: "my-peaque-app",
    initialValue: initialProjectName,
    validate(value) {
      if (value.length === 0) return `Value is required!`
      if (!/^[a-z0-9-_]+$/i.test(value)) {
        return `Project name can only contain letters, numbers, hyphens, and underscores`
      }
      if (fs.existsSync(path.join(process.cwd(), value))) {
        return `Project "${value}" already exists!`
      }
    },
  })

  if (!projectName || typeof projectName === 'symbol') {
    outro("Project creation cancelled")
    process.exit(0)
  }

  const template = await select({
    message: "Choose a template:",
    options: [
      { value: "basic", label: "Basic", hint: "Simple starter with home page and API route" },
    ],
  })

  if (!template || typeof template === 'symbol') {
    outro("Project creation cancelled")
    process.exit(0)
  }

  const s = spinner()
  s.start("Creating project...")

  try {
    await copyProject(template.toString(), projectName.toString())
    s.stop("Project created successfully!")
  } catch (error) {
    s.stop("Failed to create project")
    console.error(error)
    process.exit(1)
  }

  const packageManager = detectPackageManager()

  const shouldInstall = await confirm({
    message: "Install dependencies?",
    initialValue: true
  })

  if (!shouldInstall || typeof shouldInstall === 'symbol') {
    note(
      `Next steps:\n  cd ${projectName}\n  ${getInstallCommand(packageManager)}\n  ${getRunCommand(packageManager)} dev`,
      "Get started"
    )
    outro("Happy coding! 🚀")
    process.exit(0)
  }

  const installSpinner = spinner()
  const installCmd = getInstallCommand(packageManager)
  installSpinner.start(`Installing dependencies with ${packageManager}...`)

  await new Promise((resolve, reject) => {
    const child = child_process.exec(installCmd, { cwd: `./${projectName.toString()}` })
    child.stdout?.pipe(process.stdout)
    child.stderr?.pipe(process.stderr)
    child.on("exit", function (code: number) {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Installation failed with code ${code}`))
      }
    })
  }).catch((error) => {
    installSpinner.stop("Installation failed")
    console.error(error)
    process.exit(1)
  })

  installSpinner.stop("Dependencies installed!")

  note(
    `cd ${projectName}\n${getRunCommand(packageManager)} dev`,
    "Next steps"
  )

  outro(`You're all set! Happy coding! 🚀`)
}

main().catch((error) => {
  console.error("An error occurred:", error)
  process.exit(1)
})
