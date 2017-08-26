const TestRunner = require('./src/TestRunner')

exports.runTests = async function (options) {
  return new Promise((resolve, reject) => {
    // Look for the config file. If one isn't found, keep
    // going up the directory tree until you're at root
    while (!process.cwd === '/') {
      try {
        const configPath = process.cwd() + '.mocha-puppeteer-config'
        const { mochaOptions, puppeteerOptions } = require(`./${configPath}`)
        options = Object.assign(options, {
          mochaOptions,
          puppeteerOptions
        })
      } catch (error) {
        process.chdir('../')
      }
    }

    const runner = new TestRunner(options)

    runner.once('complete', ({ testsPassed }) => {
      testsPassed ? resolve() : reject(new Error('Tests failed'))
    })

    runner.once('error', (error) => {
      console.error('Error occured while running tests', error)
      reject(error)
    })

    runner.start()
  })
}
