require('marko/node-require').install()
require('lasso/node-require-no-op').enable('.less', '.css')
require('lasso/browser-refresh').enable('*.marko *.css *.less')

require('marko/browser-refresh').enable()

const puppeteer = require('puppeteer')

const assert = require('assert')
const EventEmitter = require('events')

const fs = require('fs')
const { promisify } = require('util')

const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)

const uuid = require('uuid')
const rimrafAsync = promisify(require('rimraf'))

const Server = require('./Server')

const _prepareTestPageInput = require('./utils/prepareTestPageInput')

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
      lassoConfig,

      // test options
      _instrumentCode,
      _randomizeOutputDir
    } = options

    assert(Array.isArray(testFiles), 'testFiles must be provided as an array')

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

    const browser = this._browser = await puppeteer.launch()
    const page = await browser.newPage()

    const { columns } = process.stdout

    // set viewport width and height to number of columns
    // for cleaner output
    page.setViewport({ width: columns, height: columns })

    await page.goto(`http://localhost:${server.getPort()}`)
  }
}

module.exports = TestRunner
