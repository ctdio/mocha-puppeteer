const mochaPuppeteer = require('./index')
const _loadConfig = require('./src/utils/loadConfig')

const args = process.argv.slice(2)

// pick specific values from config
function _pickConfig (config) {
  /* eslint-disable */
  // TODO: Add more fields to pick (ex. puppeteerOptions)
  return ({ lassoConfig } = config)
  /* eslint-enable */
}

module.exports = async function runCli () {
  try {
    const config = await _loadConfig()

    const options = config ? _pickConfig(config) : {}

    Object.assign(options, {
      testFiles: args
    })

    await mochaPuppeteer.runTests(options)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
