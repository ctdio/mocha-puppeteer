require('marko/node-require').install()
require('lasso/node-require-no-op').enable('.less', '.css')

require('marko/browser-refresh').enable()
require('lasso/browser-refresh').enable('*.marko *.css *.less')

const puppeteer = require('puppeteer')

const assert = require('assert')
const http = require('http')
const EventEmitter = require('events')
const path = require('path')

const fs = require('fs')
const { promisify } = require('util')

const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)

const marko = require('marko')
const lasso = require('lasso')

const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const serve = require('koa-static')
const mount = require('koa-mount')
const Router = require('koa-path-router')

const testPageTemplate = marko.load(require('./pages/test-page'))

const { Server: WebSocketServer } = require('ws')

const uuid = require('uuid')
const rimrafAsync = promisify(require('rimraf'))

const DEFAULT_LASSO_CONFIG = {
  minify: false,
  bundlingEnabled: false,
  fingerprintsEnabled: false
}

const ISTANBUL_LASSO_CONFIG_ADDON = {
  require: {
    transforms: [
      {
        transform: 'lasso-babel-transform',
        config: {
          babelOptions: {
            plugins: [ require.resolve('babel-plugin-istanbul') ]
          }
        }
      }
    ]
  }
}

class TestRunner extends EventEmitter {
  constructor (options = {}) {
    super()

    this._app = null
    this._server = null
    this._browser = null

    const {
      testFiles,
      _testMode
    } = options

    assert(Array.isArray(testFiles), 'testFiles must be provided as an array')

    const outputDir = `./.mocha-puppeteer-${uuid.v4()}`

    const baseLassoConfig = Object.assign({ outputDir },
      DEFAULT_LASSO_CONFIG,
      !!process.env.NYC_CONFIG && ISTANBUL_LASSO_CONFIG_ADDON)

    const tests = testFiles.map((file) => `require-run: ${path.resolve(file)}`)

    const app = this._app = new Koa()
    const router = new Router({
      middleware: [ bodyParser() ]
    })

    router.get('/', async (ctx) => {
      ctx.type = 'html'

      // TODO: allow overrides to be applied onto config
      const pageLasso = lasso.create(baseLassoConfig)

      const dependencies = [
        'mocha/mocha.css',
        'mocha/mocha.js',
        'superagent/superagent.js',
        `require-run: ${require.resolve('./pages/test-page/setup')}`,

        // inject tests
        ...tests,

        `require-run: ${require.resolve('./pages/test-page/run-tests')}`
      ]

      this.emit('started')

      ctx.body = testPageTemplate.stream({
        lasso: pageLasso,
        dependencies
      })
    })

    router.post('/end-test', async (ctx) => {
      console.info('Tearing down test server...')
      this._server.close()
      this._browser && this._browser.close()
      console.info('Done!')

      const {
        errorMsg,
        testsPassed,
        coverageReport
      } = ctx.request.body

      if (!_testMode && coverageReport) {
        // write to nyc temp dir so that coverage can be collected
        try {
          await mkdirAsync('./.nyc_output')
        } catch (err) {
          if (err.code !== 'EEXIST') {
            console.error('Unable to create temporary directory', err)
            throw err
          }
        }

        await writeFileAsync('./.nyc_output/coverage.json', JSON.stringify(coverageReport))
      }

      // perform clean up
      await rimrafAsync(outputDir)

      if (errorMsg) {
        this.emit('error', new Error(errorMsg))
      } else {
        this.emit('complete', { testsPassed })
      }

      // return empty response as ack
      ctx.body = {}
    })

    app.use(router.getRequestHandler())
    app.use(mount('/static', serve(outputDir)))
  }

  async start () {
    return new Promise((resolve, reject) => {
      const httpServer = this._server = http.createServer(this._app.callback()).listen(async () => {
        const { port } = this._server.address()

        console.info(`Test server is listening on http://localhost:${port}...`)

        // webSockets are used to send stdout and console logs to server in order
        const webSocketServer = new WebSocketServer({
          server: httpServer,
          path: '/ws'
        })

        webSocketServer.on('connection', (client) => {
          client.on('message', (rawMessage) => {
            const { type, data } = JSON.parse(rawMessage)
            if (type === 'stdout') {
              process.stdout.write(data)
            } else {
              console.log(...data)
            }
          })
        })

        try {
          const browser = this._browser = await puppeteer.launch()
          const page = await browser.newPage()

          const { columns } = process.stdout

          // set viewport width and height to number of columns
          // for cleaner output
          page.setViewport({ width: columns, height: columns })

          await page.goto(`http://localhost:${port}`)
        } catch (err) {
          reject(err)
        }

        resolve()
      })
    })
  }
}

module.exports = TestRunner
