const TestRunner = require('./src/TestRunner')

exports.runTests = async function (options) {
  return new Promise((resolve, reject) => {
    const runner = new TestRunner(options)

    runner.once('complete', ({ testsPassed }) => {
      testsPassed ? resolve() : reject()
    })

    runner.once('error', (error) => {
      console.error('Error occured while running tests', error)
      reject(err)
    })

    runner.start()
  })
}
