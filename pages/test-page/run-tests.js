const runner = window.mocha.run()

let testsPassed = true

runner.once('fail', () => {
  testsPassed = false
})

runner.on('end', async (event) => {
  await window.superagent.post('/end-test')
    .send({ testsPassed })
})
