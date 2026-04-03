#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { execSync, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const ROOT_DIR = path.resolve(process.cwd())

const banner = `
${chalk.bold.cyan('  ____              _     ____                ')}
${chalk.bold.cyan(' | __ )  ___   ___ | | __/ ___|__ _ _ __ ___ ')}
${chalk.bold.cyan(" |  _ \\ / _ \\ / _ \\| |/ / |   / _` | '__/ __|")}
${chalk.bold.cyan(' | |_) | (_) | (_) |   <| |__| (_| | |  \\__ \\')}
${chalk.bold.cyan(' |____/ \\___/ \\___/|_|\\_\\\\____\\__,_|_|  |___/')}
${chalk.gray('  Car Rental Platform CLI')}
${chalk.gray('  نظام تأجير السيارات')}
`

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(message)
}

function info(message: string): void {
  console.log(chalk.blue('info') + '  ' + message)
}

function success(message: string): void {
  console.log(chalk.green('done') + '  ' + message)
}

function warn(message: string): void {
  console.log(chalk.yellow('warn') + '  ' + message)
}

function error(message: string): void {
  console.log(chalk.red('error') + ' ' + message)
}

function heading(title: string): void {
  log('')
  log(chalk.bold.underline(title))
  log('')
}

function resolveRoot(...segments: string[]): string {
  return path.resolve(ROOT_DIR, ...segments)
}

function dirExists(dir: string): boolean {
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory()
}

function runSync(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, {
      cwd: cwd ?? ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()
  } catch {
    return ''
  }
}

function runInteractive(cmd: string, args: string[], cwd?: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: cwd ?? ROOT_DIR,
      stdio: 'inherit',
      shell: true,
    })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Start development servers (backend, frontend, admin).
 * تشغيل خوادم التطوير (الخلفية، الواجهة الأمامية، لوحة الإدارة).
 */
async function cmdStart(options: { service?: string }): Promise<void> {
  heading('Starting BookCars Development Servers')
  info('تشغيل خوادم التطوير...')

  const services: { name: string; dir: string; script: string }[] = [
    { name: 'backend (API)',       dir: 'backend', script: 'npm run dev' },
    { name: 'frontend (Client)',   dir: 'frontend', script: 'npm run dev' },
    { name: 'admin (Dashboard)',   dir: 'admin',   script: 'npm run dev' },
  ]

  const targets = options.service
    ? services.filter((s) => s.dir === options.service)
    : services

  if (targets.length === 0) {
    error(`Unknown service: ${options.service}`)
    info('Available services: backend, frontend, admin')
    process.exit(1)
  }

  for (const svc of targets) {
    const svcDir = resolveRoot(svc.dir)
    if (!dirExists(svcDir)) {
      warn(`Directory not found: ${svc.dir} — skipping`)
      continue
    }
    info(`Starting ${chalk.bold(svc.name)} ...`)
  }

  // When running all services, launch them concurrently
  const procs = targets
    .filter((svc) => dirExists(resolveRoot(svc.dir)))
    .map((svc) => {
      const [cmd, ...args] = svc.script.split(' ')
      return runInteractive(cmd, args, resolveRoot(svc.dir))
    })

  if (procs.length === 0) {
    error('No services could be started.')
    process.exit(1)
  }

  log('')
  success(`Launched ${procs.length} service(s). Press Ctrl+C to stop.`)
  info('تم تشغيل الخدمات. اضغط Ctrl+C للإيقاف.')
  await Promise.all(procs)
}

/**
 * Build all packages and applications.
 * بناء جميع الحزم والتطبيقات.
 */
async function cmdBuild(options: { target?: string }): Promise<void> {
  heading('Building BookCars')
  info('بناء المشروع...')

  const targets: { name: string; dir: string }[] = [
    { name: 'packages',  dir: 'packages' },
    { name: 'backend',   dir: 'backend'  },
    { name: 'frontend',  dir: 'frontend' },
    { name: 'admin',     dir: 'admin'    },
  ]

  const selected = options.target
    ? targets.filter((t) => t.dir === options.target || t.name === options.target)
    : targets

  if (selected.length === 0) {
    error(`Unknown build target: ${options.target}`)
    info('Available targets: packages, backend, frontend, admin')
    process.exit(1)
  }

  for (const t of selected) {
    const tDir = resolveRoot(t.dir)
    if (!dirExists(tDir)) {
      warn(`Directory not found: ${t.dir} — skipping`)
      continue
    }

    info(`Building ${chalk.bold(t.name)} ...`)
    const code = await runInteractive('npm', ['run', 'build'], tDir)
    if (code !== 0) {
      error(`Build failed for ${t.name}`)
      process.exit(1)
    }
    success(`${t.name} built successfully`)
  }

  log('')
  success('All builds completed. تم بناء المشروع بنجاح.')
}

/**
 * Seed the database with demo data.
 * ملء قاعدة البيانات ببيانات تجريبية.
 */
async function cmdSeed(): Promise<void> {
  heading('Seeding Database')
  info('ملء قاعدة البيانات ببيانات تجريبية...')

  const backendDir = resolveRoot('backend')
  if (!dirExists(backendDir)) {
    error('Backend directory not found. Make sure you are in the project root.')
    process.exit(1)
  }

  info('Running database seed script...')
  const code = await runInteractive('npm', ['run', 'seed'], backendDir)
  if (code !== 0) {
    warn('Seed script exited with a non-zero code.')
    info('Make sure MongoDB is running and the backend is configured.')
    info('تأكد من تشغيل MongoDB وتهيئة الخادم الخلفي.')
    process.exit(1)
  }

  success('Database seeded successfully. تم ملء قاعدة البيانات بنجاح.')
}

/**
 * Check service status.
 * التحقق من حالة الخدمات.
 */
async function cmdStatus(): Promise<void> {
  heading('BookCars Service Status')
  info('التحقق من حالة الخدمات...')

  // Check directory presence
  const dirs = ['backend', 'frontend', 'admin', 'packages', 'mobile']
  for (const dir of dirs) {
    const full = resolveRoot(dir)
    const exists = dirExists(full)
    const hasModules = exists && dirExists(path.join(full, 'node_modules'))
    const marker = exists ? chalk.green('[found]') : chalk.red('[missing]')
    const deps = hasModules ? chalk.green('deps installed') : chalk.yellow('deps not installed')
    log(`  ${marker}  ${chalk.bold(dir.padEnd(12))} ${exists ? deps : ''}`)
  }

  log('')

  // Check if MongoDB is reachable
  const mongoRunning = runSync('pgrep -x mongod') !== '' || runSync('pgrep -x mongos') !== ''
  if (mongoRunning) {
    log(`  ${chalk.green('[running]')}  ${chalk.bold('MongoDB')}`)
  } else {
    log(`  ${chalk.yellow('[not detected]')}  ${chalk.bold('MongoDB')} — may be running remotely or in Docker`)
  }

  // Check Docker
  const dockerRunning = runSync('docker info 2>/dev/null') !== ''
  if (dockerRunning) {
    const containers = runSync('docker ps --filter "name=bookcars" --format "{{.Names}}"')
    if (containers) {
      log(`  ${chalk.green('[running]')}  ${chalk.bold('Docker containers:')} ${containers.replace(/\n/g, ', ')}`)
    } else {
      log(`  ${chalk.blue('[idle]')}     ${chalk.bold('Docker')} — no BookCars containers running`)
    }
  } else {
    log(`  ${chalk.gray('[n/a]')}      ${chalk.bold('Docker')} — not available`)
  }

  log('')
  info('Status check complete. اكتمل التحقق من الحالة.')
}

/**
 * Reset the database.
 * إعادة تعيين قاعدة البيانات.
 */
async function cmdDbReset(): Promise<void> {
  heading('Database Reset')
  warn('This will drop all data in the BookCars database!')
  warn('سيتم حذف جميع البيانات في قاعدة البيانات!')
  log('')

  const backendDir = resolveRoot('backend')
  if (!dirExists(backendDir)) {
    error('Backend directory not found.')
    process.exit(1)
  }

  info('Resetting database...')
  info('إعادة تعيين قاعدة البيانات...')

  const code = await runInteractive('npm', ['run', 'db:reset'], backendDir)
  if (code !== 0) {
    warn('Reset script exited with a non-zero code.')
    info('You can also reset manually via: mongosh --eval "use bookcars" --eval "db.dropDatabase()"')
    process.exit(1)
  }

  success('Database has been reset. تمت إعادة تعيين قاعدة البيانات.')
}

/**
 * Show GPS tracking status.
 * عرض حالة تتبع GPS.
 */
async function cmdTracking(): Promise<void> {
  heading('GPS Tracking Status')
  info('عرض حالة تتبع نظام تحديد المواقع...')

  log(`  ${chalk.bold('Tracking Module')}`)
  log(`  ${'─'.repeat(40)}`)

  // Check if tracking-related code exists in the backend
  const backendDir = resolveRoot('backend')
  const frontendDir = resolveRoot('frontend')

  const backendExists = dirExists(backendDir)
  const frontendExists = dirExists(frontendDir)

  log(`  Backend API:    ${backendExists ? chalk.green('available') : chalk.red('not found')}`)
  log(`  Frontend app:   ${frontendExists ? chalk.green('available') : chalk.red('not found')}`)

  // Look for tracking-related env vars
  const envFile = resolveRoot('backend', '.env')
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8')
    const hasTrackingConfig = envContent.includes('TRACKING') || envContent.includes('GPS')
    log(`  GPS config:     ${hasTrackingConfig ? chalk.green('configured') : chalk.yellow('not configured')}`)
  } else {
    log(`  GPS config:     ${chalk.yellow('.env not found')}`)
  }

  log('')
  log(chalk.gray('  GPS tracking allows real-time vehicle location monitoring.'))
  log(chalk.gray('  يتيح تتبع GPS مراقبة موقع المركبات في الوقت الفعلي.'))
  log('')
  info('Tracking status check complete.')
}

// ---------------------------------------------------------------------------
// Program definition
// ---------------------------------------------------------------------------

const program = new Command()

program
  .name('bookcars')
  .description('CLI for the BookCars car rental platform\nأداة سطر الأوامر لمنصة BookCars لتأجير السيارات')
  .version('1.0.0')
  .addHelpText('beforeAll', banner)

program
  .command('start')
  .description('Start development servers (backend, frontend, admin)\nتشغيل خوادم التطوير')
  .option('-s, --service <name>', 'Start a specific service: backend, frontend, admin')
  .action(cmdStart)

program
  .command('build')
  .description('Build all packages and applications\nبناء جميع الحزم والتطبيقات')
  .option('-t, --target <name>', 'Build a specific target: packages, backend, frontend, admin')
  .action(cmdBuild)

program
  .command('seed')
  .description('Seed the database with demo data\nملء قاعدة البيانات ببيانات تجريبية')
  .action(cmdSeed)

program
  .command('status')
  .description('Check service and dependency status\nالتحقق من حالة الخدمات والتبعيات')
  .action(cmdStatus)

program
  .command('db:reset')
  .description('Reset the database (drops all data)\nإعادة تعيين قاعدة البيانات')
  .action(cmdDbReset)

program
  .command('tracking')
  .description('Show GPS tracking module status\nعرض حالة وحدة تتبع GPS')
  .action(cmdTracking)

program.parse(process.argv)
