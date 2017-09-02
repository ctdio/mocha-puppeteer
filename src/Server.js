const http = require('http')
const EventEmitter = require('events')

const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const serve = require('koa-static')
const mount = require('koa-mount')
const Router = require('koa-path-router')

const marko = require('marko')
const TestPage = marko.load(require('./pages/test-page'))

const { Server: WebSocketServer } = require('ws')

class Server extends EventEmitter {
  constructor ({ outputDir, pageLasso, dependencies }) {
    super()

    const app = this._app = new Koa()
    const router = new Router({
      middleware: [ bodyParser() ]
    })

    router.get('/', async (ctx) => {
      this.emit('start')
      ctx.type = 'html'

      ctx.body = TestPage.stream({
        lasso: pageLasso,
        dependencies
      })

      ctx.body.on('error', console.error)
    })

    router.post('/end-test', async (ctx) => {
      const {
        errorMsg,
        testsPassed,
        coverageReport
      } = ctx.request.body

      this.emit('end', {
        errorMsg,
        testsPassed,
        coverageReport
      })

      // return empty response as ack
      ctx.body = {}
    })

    app.use(router.getRequestHandler())
    app.use(mount('/static', serve(outputDir)))
  }

  getPort () {
    return this._port
  }

  close () {
    if (this._server && this._server.listening) {
      this._server.close()
    }
  }

  async listen () {
    return new Promise((resolve) => {
      const httpServer = this._server = http.createServer(this._app.callback())
        .listen(async () => {
          const { port } = httpServer.address()
          this._port = port

          console.info(`Test server is listening on http://localhost:${port}...`)

          // webSockets are used to send stdout and console logs to server in order
          const webSocketServer = this._webSocketServer = new WebSocketServer({
            server: httpServer,
            path: '/ws'
          })

          webSocketServer.on('connection', (client) => {
            client.on('message', (rawMessage) => {
              const { type, data } = JSON.parse(rawMessage)
              if (type === 'stdout') {
                this.emit('stdout', data)
              } else {
                this.emit('console', ...data)
              }
            })
            this.emit('web-socket-connection', client)
          })

          resolve()
        })
    })
  }
}

module.exports = Server
