const mochaPuppeteer = require('./index')
const _loadConfig = require('../src/utils/loadConfig')

const args = process.argv.slice(2)

module.exports = async function runCli () {
  try {
    const config = await _loadConfig()
    console.log(config)

    await mochaPuppeteer.runTests({
      testFiles: args
    })
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
