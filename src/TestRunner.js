require('marko/node-require').install()
require('lasso/node-require-no-op').enable('.less', '.css')
require('lasso/browser-refresh').enable('*.marko *.css *.less')

require('marko/browser-refresh').enable()

const puppeteer = require('puppeteer')

const assert = require('assert')
const EventEmitter = require('events')

const fs = require('fs')
const { promisify } = require('bluebird')

const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)

const uuid = require('uuid')
const rimrafAsync = promisify(require('rimraf'))

const Server = require('./Server')

const _prepareTestPageInput = require('./utils/prepareTestPageInput')

const DEFAULT_MOCHA_OPTIONS = {
  ui: 'bdd',
  reporter: 'spec',
  useColors: true
}

class TestRunner extends EventEmitter {
  constructor (options) {
    super()

    assert(options, 'Test runner options must be provided (at least testFiles)')

    this._app = null
    this._httpServer = null
    this._webSocketServer = null
    this._browser = null

    const {
      testFiles,
      mochaOptions,
      lassoConfig,
      lassoDependencies,
      puppeteerLaunchOptions,

      // test options
      _instrumentCode,
      _randomizeOutputDir
    } = options

    this._mochaOptions = mochaOptions
    this._puppeteerLaunchOptions = puppeteerLaunchOptions

    assert(Array.isArray(testFiles), 'testFiles must be provided as an array')
    if (lassoDependencies) {
      assert(Array.isArray(lassoDependencies), 'lassoDependencies must be provided as an array')
    }

    // use output dir from lasso config if present
    const outputDir = (lassoConfig && lassoConfig.outputDir) ||
      `./.mocha-puppeteer${_randomizeOutputDir ? uuid.v4() : ''}`

    const instrumentCode = _instrumentCode === undefined
      ? !!process.env.NYC_CONFIG
      : !!_instrumentCode

    const { pageLasso, dependencies } = _prepareTestPageInput({
      outputDir,
      instrumentCode,
      lassoConfig,
      lassoDependencies,
      testFiles
    })

    const server = this._server = new Server({
      outputDir,
      pageLasso,
      dependencies
    })

    server.on('console', console.log)
    server.on('stdout', (output) => process.stdout.write(output))

    server.on('start', () => this.emit('start'))

    server.on('end', async ({ errorMsg, testsPassed, coverageReport }) => {
      server.close()
      this._browser && this._browser.close()

      if (coverageReport) {
        let ableToWriteFile = true
        // write to nyc temp dir so that coverage can be collected
        try {
          await mkdirAsync('./.nyc_output')
        } catch (err) {
          if (err.code !== 'EEXIST') {
            console.error('Unable to create temporary directory', err)
            ableToWriteFile = false
          }
        }

        if (ableToWriteFile) {
          await writeFileAsync('./.nyc_output/coverage.json',
            JSON.stringify(coverageReport))
        }
      }

      if (_randomizeOutputDir) {
        await rimrafAsync(outputDir)
      }

      if (errorMsg) {
        this.emit('error', new Error(errorMsg))
      } else {
        this.emit('complete', { testsPassed })
      }
    })
  }

  async start () {
    const server = this._server
    await server.listen()

    // config mocha options
    const mochaOptions = Object.assign({},
      DEFAULT_MOCHA_OPTIONS, this._mochaOptions)

    const browser = this._browser = await puppeteer.launch(this._puppeteerLaunchOptions)
    const page = await browser.newPage()

    page.on('error', (err) => this.emit('error', err))
    page.on('pageerror', (err) => this.emit('error', err))

    const { columns } = process.stdout

    // set viewport width and height to number of columns
    // for cleaner output
    page.setViewport({ width: columns, height: columns })

    await page.goto(`http://localhost:${server.getPort()}` +
      `#${JSON.stringify({ mochaOptions })}`)
  }
}

module.exports = TestRunner
