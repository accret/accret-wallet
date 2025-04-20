import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { spawnSync } from 'child_process'

const dirs = ['node_modules', '.expo', 'android', 'ios'] as const

// 1) Remove folders
dirs.forEach(dir => {
    const fullPath = path.resolve(process.cwd(), dir)
    if (fs.existsSync(fullPath)) {
        console.log(`→ Removing ${dir}…`)
        fs.rmSync(fullPath, { recursive: true, force: true })
    } else {
        console.log(`→ ${dir} not found, skipping.`)
    }
})

// 2) If non-interactive (CI), skip prompt
if (!process.stdin.isTTY) {
    console.log('→ Non-interactive environment detected. Reinstalling dependencies…')
    const res = spawnSync('yarn', { stdio: 'inherit' })
    process.exit(res.status || 0)
}

// 3) Otherwise, wait for Enter
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

rl.question('Press [Enter] to install dependencies…', () => {
    rl.close()
    console.log('→ Reinstalling dependencies with yarn…')
    const res = spawnSync('yarn', { stdio: 'inherit' })
    process.exit(res.status || 0)
})
