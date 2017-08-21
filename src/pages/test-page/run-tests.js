const runner = window.mocha.run()

let testsPassed = true

const testTimeout = setTimeout(async () => {
  await window.superagent.post('/end-test')
    .send({ errorMsg: 'No tests detected' })
}, 1000)

runner.once('fail', () => {
  testsPassed = false
})

runner.on('start', () => {
  clearTimeout(testTimeout)
})

runner.on('end', async (event) => {
  await window.superagent.post('/end-test')
    .send({ testsPassed })
})
