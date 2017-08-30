require('require-self-ref')

const test = require('ava')

const sinon = require('sinon')
const proxyquire = require('proxyquire')
proxyquire.noPreserveCache()

const waitForEvent = require('~/test/util/waitForEvent')

const superagent = require('superagent')
const WebSocket = require('ws')
const EventEmitter = require('events')

const uuid = require('uuid')

class MockPage extends EventEmitter {
  async goto (url) {
    await superagent.get(url).send()
  }

  setViewport () {}
}

async function _sendTestEndRequest (testRunner, payload) {
  const server = testRunner._server
  const { port } = server.address()

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

  const TestRunner = proxyquire('~/src/TestRunner', {
    puppeteer: mockPuppeteer,
    fs: mockFs
  })

  const testRunner = new TestRunner({
    testFiles: [] // use empty array
  })

  t.context = {
    testRunner,
    mockPuppeteer,
    mockBrowser,
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
  const { port } = server.address()

  sandbox.assert.calledWith(gotoSpy, `http://localhost:${port}`)
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

test('should not error out if mkdirAsync throws an error code ' +
'that is not "EEXIST"', async (t) => {
  t.plan(0)

  const {
    sandbox,
    mockPuppeteer,
    mockFs
  } = t.context

  const testError = new Error('Code is not "EEXIST"')
  testError.code = 'NOT_EEXIST'
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

  const startedPromise = waitForEvent(testRunner, 'started')
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

  const startedPromise = waitForEvent(testRunner, 'started')
  await testRunner.start()
  const runnerClientPromise = waitForEvent(testRunner._webSocketServer, 'connection')
  console.log('got a client')
  await startedPromise

  const { port } = testRunner._server.address()

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
