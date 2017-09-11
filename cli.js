const argly = require('argly')
const mochaPuppeteer = require('./index')
const _loadConfig = require('./src/utils/loadConfig')

const mochaPuppeteerPkgVersion = require('./package.json').version

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
      type: 'string[]',
      description: 'Pattern to run tests. Either a single file or glob pattern.'
    },
    '--reporter -r': {
      type: 'string',
      description: 'The mocha test reporter to use. (Defaults to "spec")'
    },
    '--useColors -c': {
      type: 'boolean',
      description: 'Whether use colors for test output. (Defaults to true)'
    },
    '--ui -u': {
      type: 'string',
      description: 'The mocha ui to use. (Defaults to "bdd")'
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
    version,

    // mocha options (TODO: add more)
    reporter,
    useColors,
    ui
  } = parser.parse()

  // Gracefully exit if either the "help" or "version" arguments are supplied
  // of if the "pattern" argument is missing because it's required.
  if (help || version || !pattern) return

  try {
    let mochaOptions = {}
    let lassoConfig = {}
    let lassoDependencies = []

    const config = await _loadConfig({
      startingDirectory: process.cwd()
    })

    if (config) {
      config.mochaOptions && (mochaOptions = config.mochaOptions)
      config.lassoConfig && (lassoConfig = config.lassoConfig)
      config.lassoDependencies && (lassoDependencies = config.lassoDependencies)
    }

    // apply cli overrides
    reporter !== undefined && (mochaOptions.reporter = reporter)
    useColors !== undefined && (mochaOptions.useColors = useColors)
    ui !== undefined && (mochaOptions.ui = ui)

    const options = Object.assign({
      mochaOptions,
      lassoConfig,
      lassoDependencies
    }, { testFiles: pattern })

    await mochaPuppeteer.runTests(options)
  } catch (err) {
    throw err
  }
}
