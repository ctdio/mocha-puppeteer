// TODO: make these configurable
const { Mocha, WebSocket, superagent, location } = window
const { hostname, port } = location

const socket = new WebSocket(`ws://${hostname}:${port}/ws`)

socket.addEventListener('open', () => {
  // patch stdout to send strings written to stdout
  // to server for output
  Mocha.process.stdout.write = function (str) {
    socket.send(str)
  }

  // patch console log to create newline when no args are supplied
  // (console logs are forwarded to server)
  const oldConsoleLog = console.log
  console.log = function (...args) {
    if (args.length === 0) {
      oldConsoleLog('')
    } else {
      oldConsoleLog(...args)
    }
  }

  const runner = window.mocha.run()

  let testsPassed = true

  const testTimeout = setTimeout(async () => {
    // TODO: send this over ws, fallback to http post if ws fails
    await superagent.post('/end-test')
      .send({ errorMsg: 'No tests detected' })
  }, 1000)

  runner.once('fail', () => {
    testsPassed = false
  })

  runner.on('start', () => {
    clearTimeout(testTimeout)
  })

  runner.on('end', async (event) => {
    // TODO: send this over ws, fallback to http post if ws fails
    await superagent.post('/end-test')
      .send({ testsPassed })
  })
})
