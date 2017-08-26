const TestRunner = require('./src/TestRunner')
const fs = require('fs')

exports.runTests = async function (options) {
  return new Promise((resolve, reject) => {
    const configPath = '.mocha-puppeteer-config.js'
    if (fs.existsSync(configPath)) {
      const { mochaOptions, puppeteerOptions } = require(`./${configPath}`)
      options = Object.assign({}, options, { mochaOptions }, { puppeteerOptions })
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
