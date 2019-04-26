require('babel-polyfill')
require('marko/node-require').install()

const argly = require('argly')
const resolveFrom = require('resolve-from')
const mochaPuppeteer = require('./index')
const _loadConfig = require('./utils/loadConfig')

const mochaPuppeteerPkgVersion = require('../package.json').version

function _resolveTestPage (testPagePath) {
  try {
    return require(resolveFrom(process.cwd(), testPagePath))
  } catch (err) {
    throw new Error(`Invalid "testPagePath" provided: "${testPagePath}"`)
  }
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
    '--testPagePath -P': {
      type: 'string',
      description: 'Path to a custom Marko test page'
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
    },
    '--ignoreHTTPSErrors -i': {
      type: 'boolean',
      description: 'Whether to ignore HTTPS errors during navigation. Defaults to false.'
    },
    '--headless -H': {
      type: 'boolean',
      description: 'Whether to run Chromium in headless mode. Defaults to true.'
    },
    '--executablePath -e': {
      type: 'string',
      description: 'Path to a Chromium executable to run instead of bundled Chromium. If executablePath is a relative path, then it is resolved relative to current working directory.'
    },
    '--slowMo -s': {
      type: 'number',
      description: 'Slows down Puppeteer operations by the specified amount of milliseconds. Useful so that you can see what is going on.'
    },
    '--args -a': {
      type: 'string[]',
      description: 'Additional arguments to pass to the Chromium instance. List of Chromium flags can be found at https://peter.sh/experiments/chromium-command-line-switches/.'
    },
    '--handleSIGINT -S': {
      type: 'boolean',
      description: 'Close chrome process on Ctrl-C. Defaults to true.'
    },
    '--puppeteerTimeout -t': {
      type: 'number',
      description: 'Maximum time in milliseconds to wait for the Chrome instance to start. Defaults to 30000 (30 seconds). Pass 0 to disable timeout.'
    },
    '--dumpio -d': {
      type: 'boolean',
      description: 'Whether to pipe browser process stdout and stderr into process.stdout and process.stderr. Defaults to false.'
    },
    '--userDataDir -D': {
      type: 'string',
      description: 'Path to a User Data Directory.'
    },
    '--puppeteerPageTimeout': {
      type: 'number',
      description: 'Maximum time in milliseconds to wait for the page to load'
    },
    '--devtools': {
      type: 'boolean',
      description: 'Turn on the Developer Tools support. Useful for debugging using the "debugger" keyword in your tests.'
    }
  })
  .example('Test a single file: "mocha-puppeteer /foo/bar-test.js"')
  .example('Test a series of files using a glob pattern: "mocha-puppeteer /foo/*/*-test.js"')
  .example('Test using Chromium args: "mocha-puppeteer /foo/bar-test.js --args account-consistency browser-startup-dialog"')
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
    throw err
  })

module.exports = async function runCli () {
  const {
    pattern,
    help,
    version,

    // mocha options (TODO: add more)
    reporter,
    useColors,
    ui,
    ignoreHTTPSErrors,
    headless,
    executablePath,
    slowMo,
    args,
    handleSIGINT,
    puppeteerTimeout,
    dumpio,
    userDataDir,
    puppeteerPageTimeout,
    testPagePath,
    devtools
  } = parser.parse()

  // Gracefully exit if either the "help" or "version" arguments are supplied
  // of if the "pattern" argument is missing because it's required.
  if (help || version || !pattern) return

  let chromeArgs

  if (args) {
    // Normalize the extra Chromium flag arguments to be prefixed with a double dash
    chromeArgs = args.map((arg) => '--' + arg)
  }

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

    const testPage = testPagePath ? _resolveTestPage(testPagePath) : undefined

    const options = Object.assign({
      mochaOptions,
      lassoConfig,
      lassoDependencies,
      testPage,
      puppeteerLaunchOptions: {
        ignoreHTTPSErrors,
        headless,
        executablePath,
        slowMo,
        args: chromeArgs,
        handleSIGINT,
        timeout: puppeteerTimeout,
        dumpio,
        userDataDir,
        devtools
      },
      puppeteerPageOptions: {
        timeout: puppeteerPageTimeout
      }
    }, { testFiles: pattern })

    await mochaPuppeteer.runTests(options)
  } catch (err) {
    throw err
  }
}
