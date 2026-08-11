#!/usr/bin/env node

import { program } from 'commander'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, 'template')

const DB_CONFIGS = {
  postgresql: {
    url: 'jdbc:postgresql://localhost:5432/vima',
    driver: 'org.postgresql.Driver',
    username: 'postgres',
    password: 'postgres',
    dialect: 'org.hibernate.dialect.PostgreSQLDialect',
    comment: 'PostgreSQL (默认)'
  },
  mysql: {
    url: 'jdbc:mysql://localhost:3306/vima?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai',
    driver: 'com.mysql.cj.jdbc.Driver',
    username: 'root',
    password: 'root',
    dialect: 'org.hibernate.dialect.MySQLDialect',
    comment: 'MySQL'
  },
  h2: {
    url: 'jdbc:h2:mem:vima;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE',
    driver: 'org.h2.Driver',
    username: 'sa',
    password: '',
    dialect: 'org.hibernate.dialect.H2Dialect',
    comment: 'H2 (开发测试)'
  },
  kingbase: {
    url: 'jdbc:kingbase8://localhost:54321/vima',
    driver: 'com.kingbase8.Driver',
    username: 'system',
    password: '123456',
    dialect: 'org.hibernate.dialect.PostgreSQLDialect',
    comment: '人大金仓 KingbaseES (信创)'
  }
}

function generateYmlConfig(dbType, projectName, backendPort, redisHost, redisPort) {
  const dbConfig = DB_CONFIGS[dbType] || DB_CONFIGS.postgresql
  
  return `server:
  port: ${backendPort}

spring:
  application:
    name: ${projectName}
  datasource:
    url: ${dbConfig.url}
    driver-class-name: ${dbConfig.driver}
    username: ${dbConfig.username}
    password: ${dbConfig.password}
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    database-platform: ${dbConfig.dialect}
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        format_sql: true
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB
  data:
    redis:
      host: ${redisHost}
      port: ${redisPort}
      password: 
      database: 0
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
          min-idle: 0
          max-wait: -1ms

jwt:
  secret: vima-starter-secret-key-must-be-at-least-256-bits-long-for-hs256!!
  expiration: 86400000

file:
  upload-dir: ./uploads
  base-url: http://localhost:${backendPort}
`
}

program
  .name('create-vima-starter')
  .description('Create Vue 3 + Java 21 + Spring Boot project')
  .version('1.0.0')
  .argument('[project-name]', 'Project name', 'my-project')
  .option('-d, --description <desc>', 'Project description', 'Vue 3 + Java 21 + Spring Boot project')
  .option('-p, --port <port>', 'Frontend port', '5173')
  .option('-b, --backend-port <port>', 'Backend port', '8080')
  .option('--db <type>', 'Database type (postgresql|mysql|h2|kingbase)', 'postgresql')
  .option('--redis-host <host>', 'Redis host', 'localhost')
  .option('--redis-port <port>', 'Redis port', '6379')
  .option('--skip-install', 'Skip npm install')
  .action(async (projectName, options) => {
    console.log(chalk.cyan('\n🚀 Vima Starter Project Creator\n'))

    const targetDir = path.resolve(process.cwd(), projectName)

    if (await fs.pathExists(targetDir)) {
      console.log(chalk.red(`Directory ${projectName} already exists!`))
      console.log(chalk.yellow('Please remove it or choose another name.'))
      return
    }

    console.log(chalk.gray(`Creating project: ${projectName}`))
    console.log(chalk.gray(`Description: ${options.description}`))
    console.log(chalk.gray(`Frontend port: ${options.port}`))
    console.log(chalk.gray(`Backend port: ${options.backendPort}`))
    console.log(chalk.gray(`Database: ${options.db}`))
    console.log(chalk.gray(`Redis: ${options.redisHost}:${options.redisPort}`))
    console.log('')

    try {
      console.log(chalk.gray('Copying template files...'))
      await fs.copy(TEMPLATE_DIR, targetDir)

      console.log(chalk.gray('Updating configuration...'))

      // Update package.json
      const pkgPath = path.join(targetDir, 'frontend', 'package.json')
      const pkg = await fs.readJson(pkgPath)
      pkg.name = projectName
      await fs.writeJson(pkgPath, pkg, { spaces: 2 })

      // Update README
      const readmePath = path.join(targetDir, 'README.md')
      let readme = await fs.readFile(readmePath, 'utf-8')
      readme = readme.replace(/\{\{PROJECT_NAME\}\}/g, projectName)
      readme = readme.replace(/\{\{DESCRIPTION\}\}/g, options.description)
      await fs.writeFile(readmePath, readme)

      // Update vite.config.ts
      const vitePath = path.join(targetDir, 'frontend', 'vite.config.ts')
      let viteConfig = await fs.readFile(vitePath, 'utf-8')
      viteConfig = viteConfig.replace(/port:\s*\d+/, `port: ${options.port}`)
      viteConfig = viteConfig.replace(/target:\s*'http:\/\/localhost:\d+'/, `target: 'http://localhost:${options.backendPort}'`)
      await fs.writeFile(vitePath, viteConfig)

      // Generate application.yml
      const ymlPath = path.join(targetDir, 'backend', 'src', 'main', 'resources', 'application.yml')
      const ymlContent = generateYmlConfig(options.db, projectName, options.backendPort, options.redisHost, options.redisPort)
      await fs.writeFile(ymlPath, ymlContent)

      console.log(chalk.green('\n✅ Project created successfully!\n'))

      if (!options.skipInstall) {
        console.log(chalk.gray('Installing frontend dependencies...'))
        try {
          execSync('npm install', { cwd: path.join(targetDir, 'frontend'), stdio: 'inherit' })
          console.log(chalk.green('✅ Dependencies installed!\n'))
        } catch {
          console.log(chalk.yellow('⚠️  Failed to install dependencies. Run npm install manually.\n'))
        }
      }

      console.log(chalk.cyan('━'.repeat(50)))
      console.log(chalk.green(`\n📁 Project: ${chalk.white(projectName)}`))
      console.log(chalk.green(`📍 Location: ${chalk.white(targetDir)}`))

      console.log(chalk.yellow('\n\n🚀 Quick Start:\n'))
      console.log(chalk.white(`  cd ${projectName}`))
      console.log(chalk.gray('\n  # Start Redis'))
      console.log(chalk.white('  redis-server'))
      console.log(chalk.gray('\n  # Frontend'))
      console.log(chalk.white('  cd frontend && npm run dev'))
      console.log(chalk.gray('\n  # Backend'))
      console.log(chalk.white('  cd backend && mvn spring-boot:run'))

      console.log(chalk.yellow('\n\n👤 Default Accounts:\n'))
      console.log(chalk.white('  admin / admin123  (Administrator)'))
      console.log(chalk.white('  test / test123    (Regular user)'))

      console.log(chalk.yellow('\n\n🗄️  Database Support:\n'))
      console.log(chalk.white('  postgresql  - PostgreSQL (default)'))
      console.log(chalk.white('  mysql       - MySQL'))
      console.log(chalk.white('  h2          - H2 (development)'))
      console.log(chalk.white('  kingbase    - 人大金仓 (信创)'))

      console.log(chalk.cyan('\n━'.repeat(50)))
      console.log(chalk.gray('\nHappy coding! 🎉\n'))

    } catch (error) {
      console.error(chalk.red('\n❌ Failed to create project:'), error.message)
      if (await fs.pathExists(targetDir)) {
        await fs.remove(targetDir)
      }
    }
  })

program.parse()
