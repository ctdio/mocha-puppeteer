const test = require('ava')

const sinon = require('sinon')
const proxyquire = require('proxyquire')
proxyquire.noPreserveCache()

const waitForEvent = require('~/test/util/waitForEvent')

const superagent = require('superagent')
const WebSocket = require('ws')
const EventEmitter = require('events')

const uuid = require('uuid')

const DEFAULT_MOCHA_OPTIONS = {
  ui: 'bdd',
  reporter: 'spec',
  useColors: true
}

class MockPage extends EventEmitter {
  async goto (url) {
    await superagent.get(url).send()
  }

  setViewport () {}
}

async function _sendTestEndRequest (testRunner, payload) {
  const server = testRunner._server
  const port = server.getPort()

  return superagent.post(`http://localhost:${port}/end-test`)
    .send(payload)
}

test.beforeEach('setup mocks and test runner', (t) => {
  const sandbox = sinon.sandbox.create()

  const mockFs = {
    writeFile (file, content, callback) {
      callback()
    },
    mkdir (dir, callback) {
      callback()
    }
  }

  const mockPage = new MockPage()
  const mockBrowser = {
    newPage: () => mockPage,
    close () {}
  }
  const mockPuppeteer = {
    launch: () => mockBrowser
  }

  const mockLasso = {
    create () {}
  }

  const TestRunner = proxyquire('~/src/TestRunner', {
    puppeteer: mockPuppeteer,
    fs: mockFs
  })

  const testRunner = new TestRunner({
    testFiles: [] // use empty array
  })

  t.context = {
    TestRunner,
    testRunner,
    mockPuppeteer,
    mockBrowser,
    mockLasso,
    mockPage,
    mockFs,
    sandbox
  }
})

test.afterEach('tear down', (t) => {
  const {
    testRunner,
    sandbox
  } = t.context

  const server = testRunner._server
  server && server.close()
  sandbox.restore()
})

test('should direct puppeteer page to "goto" the root path of the ' +
'server that is launched', async (t) => {
  t.plan(0)

  const {
    testRunner,
    mockPage,
    sandbox
  } = t.context

  const gotoSpy = sandbox.spy(mockPage, 'goto')

  await testRunner.start()

  const server = testRunner._server
  const port = server.getPort()

  sandbox.assert.calledWith(gotoSpy, sandbox.match((url) =>
    url.startsWith(`http://localhost:${port}#`)))
})

async function _testMochaOptions (context, inputOptions, expectedOptions) {
  const {
    sandbox,
    mockPage,
    TestRunner
  } = context

  const gotoSpy = sandbox.spy(mockPage, 'goto')

  const testRunner = new TestRunner({
    testFiles: [],
    mochaOptions: inputOptions
  })

  await testRunner.start()

  const server = testRunner._server
  const port = server.getPort()

  sandbox.assert.calledWith(gotoSpy, `http://localhost:${port}` +
    `#${JSON.stringify(expectedOptions)}`)
}

test('should apply default mochaOptions as part of query in url passed to "goto" ' +
'the root path of the server that is launched', async (t) => {
  t.plan(0)

  await _testMochaOptions(t.context, null, { mochaOptions: DEFAULT_MOCHA_OPTIONS })
})

test('should apply mochaOptions as part of query in url passed to "goto" ' +
'the root path of the server that is launched', async (t) => {
  t.plan(0)

  const mochaOptions = {
    ui: 'tdd',
    reporter: 'nyan',
    useColors: false
  }

  await _testMochaOptions(t.context, mochaOptions, { mochaOptions })
})

test('should fail to start if unable to start puppeteer', async (t) => {
  const {
    testRunner,
    mockPuppeteer,
    sandbox
  } = t.context

  const failedToStartError = new Error('failed to start puppeteer')

  sandbox.stub(mockPuppeteer, 'launch').throws(failedToStartError)

  try {
    await testRunner.start()
    t.fail()
  } catch (err) {
    t.is(err, failedToStartError)
    t.pass()
  }
})

test('should tear down server and browser upon ending test', async (t) => {
  t.plan(0)

  const {
    testRunner,
    sandbox
  } = t.context

  await testRunner.start()

  const serverCloseSpy = sandbox.spy(testRunner._server, 'close')
  const browserCloseSpy = sandbox.spy(testRunner._browser, 'close')

  await _sendTestEndRequest(testRunner)

  sandbox.assert.calledOnce(serverCloseSpy)
  sandbox.assert.calledOnce(browserCloseSpy)
})

test('should emit an error if an error message is sent', async (t) => {
  t.plan(0)

  const {
    testRunner
  } = t.context

  const testErrorMessage = 'Some error message'

  await testRunner.start()

  const errorPromise = waitForEvent(testRunner, 'error', (error) => {
    return error.message === testErrorMessage
  })

  await _sendTestEndRequest(testRunner, { errorMsg: testErrorMessage })

  return errorPromise
})

test('should emit "complete" with information on whether tests have ' +
'passed or not', async (t) => {
  const {
    testRunner
  } = t.context

  const expectedResult = true

  await testRunner.start()

  const testCompletePromise = waitForEvent(testRunner, 'complete')

  await _sendTestEndRequest(testRunner, {
    testsPassed: expectedResult
  })

  const { testsPassed: actualResult } = await testCompletePromise

  t.is(actualResult, expectedResult)
})

test('should call fs.mkdir and fs.writeFile upon completing a test if ' +
'coverage is reported', async (t) => {
  t.plan(0)

  const {
    sandbox,
    mockPuppeteer,
    mockFs
  } = t.context

  const testCoverage = { some: 'coverage' }

  const mkdirSpy = sandbox.spy(mockFs, 'mkdir')
  const writeFileSpy = sandbox.spy(mockFs, 'writeFile')

  const TestRunner = proxyquire('~/src/TestRunner', {
    puppeteer: mockPuppeteer,
    fs: mockFs
  })

  const testRunner = new TestRunner({
    testFiles: [],
    _instrumentCode: true
  })

  await testRunner.start()

  const testCompletePromise = waitForEvent(testRunner, 'complete')

  await _sendTestEndRequest(testRunner, {
    testsPassed: true,
    coverageReport: testCoverage
  })

  await testCompletePromise

  testRunner._server.close()

  sandbox.assert.calledWith(mkdirSpy, './.nyc_output')
  sandbox.assert.calledWith(writeFileSpy, './.nyc_output/coverage.json',
    JSON.stringify(testCoverage))
})

test('should not call fs.mkdir and fs.writeFile upon completing a test if ' +
'no coverage reported', async (t) => {
  t.plan(0)

  const {
    sandbox,
    mockPuppeteer,
    mockFs
  } = t.context

  const mkdirSpy = sandbox.spy(mockFs, 'mkdir')
  const writeFileSpy = sandbox.spy(mockFs, 'writeFile')

  const TestRunner = proxyquire('~/src/TestRunner', {
    puppeteer: mockPuppeteer,
    fs: mockFs
  })

  const testRunner = new TestRunner({
    testFiles: [],
    _instrumentCode: false
  })
  await testRunner.start()

  const testCompletePromise = waitForEvent(testRunner, 'complete')

  await _sendTestEndRequest(testRunner, {
    testsPassed: true
  })

  await testCompletePromise

  testRunner._server.close()

  sandbox.assert.notCalled(mkdirSpy)
  sandbox.assert.notCalled(writeFileSpy)
})

test('should still write coverage file if mkdir throws an error code ' +
'that is "EEXIST"', async (t) => {
  t.plan(0)

  const {
    sandbox,
    mockPuppeteer,
    mockFs
  } = t.context

  const testError = new Error('Code is "EEXIST"')
  testError.code = 'EEXIST'
  sandbox.stub(mockFs, 'mkdir').throws(testError)
  const writeFileSpy = sandbox.spy(mockFs, 'writeFile')

  const TestRunner = proxyquire('~/src/TestRunner', {
    puppeteer: mockPuppeteer,
    fs: mockFs
  })

  const testRunner = new TestRunner({
    testFiles: [],
    _instrumentCode: false
  })

  await testRunner.start()

  const testCompletePromise = waitForEvent(testRunner, 'complete')

  await _sendTestEndRequest(testRunner, {
    testsPassed: true,
    coverageReport: {}
  })

  await testCompletePromise

  testRunner._server.close()

  sandbox.assert.calledOnce(writeFileSpy)
})

test('should still write coverage file if mkdir throws an error code ' +
'that is "EEXIST"', async (t) => {
  t.plan(0)

  const {
    sandbox,
    mockPuppeteer,
    mockFs
  } = t.context

  const testError = new Error('Code is "EEXIST"')
  testError.code = 'NOT EEXIST'
  sandbox.stub(mockFs, 'mkdir').throws(testError)
  const writeFileSpy = sandbox.spy(mockFs, 'writeFile')

  const TestRunner = proxyquire('~/src/TestRunner', {
    puppeteer: mockPuppeteer,
    fs: mockFs
  })

  const testRunner = new TestRunner({
    testFiles: [],
    _instrumentCode: false
  })

  await testRunner.start()

  const testCompletePromise = waitForEvent(testRunner, 'complete')

  await _sendTestEndRequest(testRunner, {
    testsPassed: true,
    coverageReport: {}
  })

  await testCompletePromise

  testRunner._server.close()

  sandbox.assert.notCalled(writeFileSpy)
})

test('should set the viewport\'s height and width to the stdout column width', async (t) => {
  t.plan(0)

  const {
    testRunner,
    mockPage,
    sandbox
  } = t.context

  const setViewportSpy = sandbox.spy(mockPage, 'setViewport')

  const startedPromise = waitForEvent(testRunner, 'start')
  await testRunner.start()

  await startedPromise

  const { columns } = process.stdout

  sandbox.assert.calledWith(setViewportSpy, {
    width: columns,
    height: columns
  })
})

test('should call process.stdout.write if websocket server receives ' +
'a message of type "stdout"', async (t) => {
  t.plan(0)

  const {
    testRunner,
    sandbox
  } = t.context

  const testData = uuid.v4()
  const testMessage = JSON.stringify({
    type: 'stdout',
    data: testData
  })

  const writeSpy = sandbox.spy(process.stdout, 'write')

  const startedPromise = waitForEvent(testRunner, 'start')
  await testRunner.start()
  const runnerClientPromise = waitForEvent(testRunner._server, 'web-socket-connection')
  await startedPromise

  const port = testRunner._server.getPort()

  const webSocket = new WebSocket(`ws://localhost:${port}/ws`)
  await waitForEvent(webSocket, 'open')
  const runnerWebSocketClient = await runnerClientPromise

  const messagePromise = waitForEvent(runnerWebSocketClient, 'message', (message) => {
    return message === testMessage
  })

  webSocket.send(testMessage)

  await messagePromise
  sandbox.assert.calledWith(writeSpy, testData)
})

test('should throw an error if no test options are provided', async (t) => {
  t.plan(1)

  const {
    TestRunner
  } = t.context

  try {
    const testRunner = new TestRunner()
    await testRunner.start()
  } catch (err) {
    t.true(err.message.includes('options must be provided'))
  }
})

test('should emit error if page emits pageerror', async (t) => {
  t.plan(0)

  const {
    testRunner,
    mockPage
  } = t.context

  const testErrorMessage = 'hello'

  const testRunnerErrorPromise = waitForEvent(testRunner, 'error', (error) => {
    return error.message === testErrorMessage
  })

  await testRunner.start()
  mockPage.emit('pageerror', new Error(testErrorMessage))

  return testRunnerErrorPromise
})

test('should emit error if page emits error', async (t) => {
  t.plan(0)

  const {
    testRunner,
    mockPage
  } = t.context

  const testErrorMessage = 'hello'

  const testRunnerErrorPromise = waitForEvent(testRunner, 'error', (error) => {
    return error.message === testErrorMessage
  })

  await testRunner.start()
  mockPage.on('error', () => {})
  mockPage.emit('error', new Error(testErrorMessage))

  return testRunnerErrorPromise
})

test('should throw error if lassoDependencies are not supplied as an array', async (t) => {
  t.plan(1)

  const {
    TestRunner
  } = t.context

  try {
    const testRunner = new TestRunner({
      testFiles: [],
      lassoDependencies: 'not an array'
    })
    testRunner.start()
  } catch (err) {
    t.true(err.message.includes('lassoDependencies must be provided as an array'))
  }
})
