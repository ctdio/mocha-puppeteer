const argly = require('argly')
const mochaPuppeteer = require('./index')
const _loadConfig = require('./src/utils/loadConfig')

const mochaPuppeteerPkgVersion = require('./package.json').version

// pick specific values from config
function _pickConfig (config) {
  /* eslint-disable */
  // TODO: Add more fields to pick (ex. puppeteerOptions)
  return ({ lassoConfig } = config)
  /* eslint-enable */
}

const parser = argly
  .createParser({
    '--help -h': {
      type: 'string',
      description: 'Show this help message'
    },
    '--version -v': {
      type: 'string',
      description: 'Show the version number of mocha-puppeteer'
    },
    '--pattern -p *': {
      type: 'string',
      description: 'Pattern to run tests. Either a single file or glob pattern.'
    }
  })
  .example('Test a single file: "mocha-puppeteer /foo/bar-test.js"')
  .example('Test a series of files using a glob pattern: "mocha-puppeteer /foo/*/*-test.js"')
  .validate(function (result) {
    if (result.help) {
      this.printUsage()
    } else if (result.version) {
      console.log(`mocha-puppeteer@${mochaPuppeteerPkgVersion}`)
    } else if (!result.pattern) {
      this.printUsage()
    }
  })
  .onError(function (err) {
    this.printUsage()
    throw new Error('Error parsing command line args: ', err)
  })

module.exports = async function runCli () {
  const {
    pattern,
    help,
    version
  } = parser.parse()

  // Gracefully exit if either the "help" or "version" arguments are supplied
  // of if the "pattern" argument is missing because it's required.
  if (help || version || !pattern) return

  try {
    const config = await _loadConfig({
      startingDirectory: process.cwd()
    })

    const options = config ? _pickConfig(config) : {}

    Object.assign(options, { testFiles: [ pattern ] })

    await mochaPuppeteer.runTests(options)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
