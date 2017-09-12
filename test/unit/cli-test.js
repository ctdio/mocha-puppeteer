const test = require('ava')

const sinon = require('sinon')
const proxyquire = require('proxyquire')
proxyquire.noPreserveCache()

const TEST_PATTERN = [ 'test-pattern' ]

const LOAD_CONFIG_INPUT = {
  startingDirectory: process.cwd()
}

test.beforeEach((t) => {
  const sandbox = sinon.sandbox.create()

  t.context = { sandbox }
})

test.afterEach((t) => {
  const { sandbox } = t.context
  sandbox.restore()
})

function _prepareArgumentParser (options) {
  const {
    sandbox,
    parseOutput,
    loadConfigFunc,
    printUsageFunc,
    runTestsFunc,
    parseError
  } = options

  let validateCallback
  let errorCallback

  const parser = {
    example: () => parser,
    validate (callback) {
      validateCallback = callback
      return parser
    },
    onError (callback) {
      errorCallback = callback
      return parser
    },
    printUsage: printUsageFunc || sandbox.stub(),
    parse () {
      if (parseError) {
        errorCallback.apply(parser, [ parseError ])
        return
      }
      validateCallback.apply(parser, [ parseOutput ])
      return parseOutput
    }
  }

  return proxyquire('~/cli', {
    './index': { runTests: runTestsFunc },
    './src/utils/loadConfig': loadConfigFunc,
    'argly': { createParser: () => parser }
  })
}

// should return early if "help", "version" parsed from cli
test(`should return early and print usage if "help" arg is provided`, async (t) => {
  t.plan(0)
  const { sandbox } = t.context

  const loadConfigSpy = sandbox.spy()
  const runTestsSpy = sandbox.spy()
  const printUsageSpy = sandbox.spy()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: { help: true },
    loadConfigFunc: loadConfigSpy,
    printUsageFunc: printUsageSpy,
    runTestsFunc: runTestsSpy
  })

  await runCli()

  sandbox.assert.calledOnce(printUsageSpy)
  sandbox.assert.notCalled(loadConfigSpy)
  sandbox.assert.notCalled(runTestsSpy)
})

test(`should return early and print usage if "version" is provided`, async (t) => {
  t.plan(0)
  const { sandbox } = t.context

  const loadConfigSpy = sandbox.spy()
  const runTestsSpy = sandbox.spy()
  const printUsageSpy = sandbox.spy()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: { version: true },
    loadConfigFunc: loadConfigSpy,
    printUsageFunc: printUsageSpy,
    runTestsFunc: runTestsSpy
  })

  await runCli()

  sandbox.assert.notCalled(printUsageSpy)
  sandbox.assert.notCalled(loadConfigSpy)
  sandbox.assert.notCalled(runTestsSpy)
})

test(`should return early if no test patterns/files are provided`, async (t) => {
  t.plan(0)
  const { sandbox } = t.context

  const loadConfigSpy = sandbox.spy()
  const runTestsSpy = sandbox.spy()
  const printUsageSpy = sandbox.spy()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: {},
    loadConfigFunc: loadConfigSpy,
    printUsageFunc: printUsageSpy,
    runTestFunc: runTestsSpy
  })

  await runCli()

  sandbox.assert.calledOnce(printUsageSpy)
  sandbox.assert.notCalled(loadConfigSpy)
  sandbox.assert.notCalled(runTestsSpy)
})

test(`should call run tests if a pattern is provided`, async (t) => {
  t.plan(0)
  const { sandbox } = t.context

  const loadConfigSpy = sandbox.spy()
  const runTestsSpy = sandbox.spy()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: { pattern: TEST_PATTERN },
    loadConfigFunc: loadConfigSpy,
    runTestsFunc: runTestsSpy
  })

  await runCli()

  sandbox.assert.calledWith(loadConfigSpy, LOAD_CONFIG_INPUT)
  sandbox.assert.calledWith(runTestsSpy, sandbox.match.has('testFiles', TEST_PATTERN))
})

test(`should apply mochaOptions if loadConfig returns a config`, async (t) => {
  t.plan(0)
  const { sandbox } = t.context

  const mochaOptions = {
    useColors: false
  }

  const loadConfigSpy = sandbox.stub().returns({ mochaOptions })
  const runTestsSpy = sandbox.spy()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: { pattern: TEST_PATTERN },
    loadConfigFunc: loadConfigSpy,
    runTestsFunc: runTestsSpy
  })

  await runCli()

  sandbox.assert.calledWith(loadConfigSpy, LOAD_CONFIG_INPUT)

  sandbox.assert.calledWith(runTestsSpy, sandbox.match.has('mochaOptions', mochaOptions))
})

test('should be able to override loaded if parser returns ' +
'relevant values', async (t) => {
  t.plan(0)
  const { sandbox } = t.context

  const mochaOptions = {
    useColors: false,
    reporter: 'progress',
    ui: 'tdd'
  }

  const overrideOptions = {
    useColors: true,
    reporter: 'nyan',
    ui: 'bdd'
  }

  const parseOutput = Object.assign({ pattern: TEST_PATTERN },
    overrideOptions)

  const lassoConfig = {
    some: 'config'
  }

  const loadConfigSpy = sandbox.stub().returns({
    mochaOptions,
    lassoConfig
  })
  const runTestsSpy = sandbox.spy()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput,
    loadConfigFunc: loadConfigSpy,
    runTestsFunc: runTestsSpy
  })

  await runCli()

  sandbox.assert.calledWith(loadConfigSpy, LOAD_CONFIG_INPUT)

  sandbox.assert.calledWith(runTestsSpy,
    sandbox.match.has('mochaOptions', overrideOptions))
})

test('should exit the process if runTests throws an error' +
'relevant values', async (t) => {
  t.plan(1)
  const { sandbox } = t.context

  const runTestsError = new Error('Failed to run tests')

  const loadConfigSpy = sandbox.stub()
  const runTestsSpy = sandbox.stub().throws(runTestsError)

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: {
      pattern: TEST_PATTERN
    },
    loadConfigFunc: loadConfigSpy,
    runTestsFunc: runTestsSpy
  })

  try {
    await runCli()
  } catch (err) {
    t.is(err, runTestsError)
  }
})

test('should throw an error upon parsing if there is an issue', async (t) => {
  t.plan(1)
  const { sandbox } = t.context

  const parseError = new Error('Failed to parse args')

  const loadConfigSpy = sandbox.stub()
  const runTestsSpy = sandbox.stub()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: {
      pattern: TEST_PATTERN
    },
    loadConfigFunc: loadConfigSpy,
    runTestsFunc: runTestsSpy,
    parseError
  })

  try {
    await runCli()
  } catch (err) {
    t.is(err.message, 'Failed to parse args')
  }
})

test('should prefix Chromium args with double dashes', async (t) => {
  t.plan(1)
  const { sandbox } = t.context
  const loadConfigSpy = sandbox.stub()

  const runCli = _prepareArgumentParser({
    sandbox,
    parseOutput: {
      pattern: TEST_PATTERN,
      args: [ 'accept-resource-provider', 'account-consistency' ]
    },
    loadConfigFunc: loadConfigSpy,
    runTestsFunc (options) {
      t.deepEqual(options.puppeteerLaunchOptions.args, [ '--accept-resource-provider', '--account-consistency' ])
    }
  })

  await runCli()
})
