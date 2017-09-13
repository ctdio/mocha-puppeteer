const TestRunner = require('./src/TestRunner')

exports.runTests = async function (options) {
  return new Promise(async (resolve, reject) => {
    try {
      const runner = new TestRunner(options)

      runner.once('complete', ({ testsPassed }) => {
        testsPassed ? resolve() : reject(new Error('Tests failed'))
      })

      runner.once('error', (error) => {
        console.error('Error occured while running tests', error)
        reject(error)
      })

      await runner.start()
    } catch (err) {
      reject(err)
    }
  })
}
