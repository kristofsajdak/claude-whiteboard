#!/usr/bin/env node
import { Command } from 'commander'
import { createServer } from './server.js'
import ngrok from '@ngrok/ngrok'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import readline from 'readline'

const program = new Command()

async function getDataDir(): Promise<string> {
  const dir = path.join(process.cwd(), '.claude-whiteboard')
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function getNgrokToken(dataDir: string): Promise<string> {
  const tokenPath = path.join(dataDir, 'ngrok-token')

  try {
    return (await fs.readFile(tokenPath, 'utf-8')).trim()
  } catch {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      rl.question('Enter your ngrok auth token (from ngrok.com/dashboard): ', async (token) => {
        rl.close()
        await fs.writeFile(tokenPath, token.trim())
        console.log('✓ Token saved')
        resolve(token.trim())
      })
    })
  }
}

async function listSessions(dataDir: string): Promise<string[]> {
  const sessionsDir = path.join(dataDir, 'sessions')
  try {
    return await fs.readdir(sessionsDir)
  } catch {
    return []
  }
}

program
  .name('claude-whiteboard-server')
  .description('Collaborative whiteboard server with Excalidraw')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('-s, --session <name>', 'Session name (creates new or resumes existing)')
  .option('--no-ngrok', 'Run without ngrok tunnel')
  .option('--list', 'List available sessions')
  .action(async (options) => {
    const dataDir = await getDataDir()

    if (options.list) {
      const sessions = await listSessions(dataDir)
      if (sessions.length === 0) {
        console.log('No sessions found')
      } else {
        console.log('Available sessions:')
        sessions.forEach(s => console.log(`  - ${s}`))
      }
      process.exit(0)
    }

    const sessionName = options.session || `session-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}`

    console.log(`Starting whiteboard session: ${sessionName}`)

    const { server, port } = await createServer({
      port: parseInt(options.port),
      dataDir,
      sessionName
    })

    console.log(`✓ Server running on port ${port}`)

    if (options.ngrok === true) {
      const token = await getNgrokToken(dataDir)
      const listener = await ngrok.connect({
        addr: port,
        authtoken: token
      })

      console.log('')
      console.log('✓ Canvas server running')
      console.log(`✓ Share this link: ${listener.url()}`)
      console.log('')
      console.log('Participants can connect their Claude Code with:')
      console.log(`  "Connect to whiteboard ${listener.url()}"`)
      console.log('')
      console.log('Press Ctrl+C to stop')
    } else {
      console.log(`✓ Running locally at http://localhost:${port}`)
    }

    process.on('SIGINT', () => {
      console.log('\nShutting down...')
      server.close()
      process.exit(0)
    })
  })

program.parse()
