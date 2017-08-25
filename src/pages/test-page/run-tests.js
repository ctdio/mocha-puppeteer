// TODO: make these configurable
const { Mocha, WebSocket, superagent, location } = window
const { hostname, port } = location

const socket = new WebSocket(`ws://${hostname}:${port}/ws`)

socket.addEventListener('open', () => {
  // patch stdout to send strings written to stdout
  Mocha.process.stdout.write = function (data) {
    socket.send(JSON.stringify({
      type: 'stdout',
      data
    }))
  }

  // patch console log to send logs
  console.log = function (...args) {
    socket.send(JSON.stringify({
      type: 'console',
      data: args
    }))
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
