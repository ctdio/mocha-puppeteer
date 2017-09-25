const http = require('http')
const EventEmitter = require('events')

const express = require('express')
const bodyParser = require('body-parser')

const marko = require('marko')
const markoExpress = require('marko/express')
const TestPage = marko.load(require('./pages/test-page'))

const { Server: WebSocketServer } = require('ws')

class Server extends EventEmitter {
  constructor ({ outputDir, pageLasso, dependencies, testPage }) {
    super()

    const app = this._app = express()
    app.use(bodyParser.json({ limit: '100mb' }))
    app.use(markoExpress())

    testPage = (testPage && marko.load(testPage)) || TestPage

    app.get('/', (req, res) => {
      this.emit('start')

      res.marko(testPage, {
        lasso: pageLasso,
        dependencies
      })
    })

    app.post('/end-test', (req, res) => {
      const {
        errorMsg,
        testsPassed,
        coverageReport
      } = req.body

      this.emit('end', {
        errorMsg,
        testsPassed,
        coverageReport
      })

      // return empty response as ack
      res.send({})
    })

    app.use('/static', express.static(outputDir))
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
      const httpServer = this._server = http.createServer(this._app)
        .listen(() => {
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
