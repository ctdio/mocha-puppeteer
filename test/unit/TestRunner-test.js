require('require-self-ref')

const test = require('ava')

const sinon = require('sinon')
const proxyquire = require('proxyquire')
proxyquire.noPreserveCache()

const waitForEvent = require('~/test/util/waitForEvent')

const superagent = require('superagent')
const EventEmitter = require('events')

class MockPage extends EventEmitter {
  goto () {}
}

async function _sendTestEndRequest (testRunner, payload) {
  const server = testRunner._server
  const { port } = server.address()

  return superagent.post(`http://localhost:${port}/end-test`)
    .send(payload)
}

test.beforeEach('setup mocks and test runner', (t) => {
  const sandbox = sinon.sandbox.create()

  const mockPage = new MockPage()

  const mockBrowser = {
    newPage: () => mockPage,
    close () {}
  }

  const TestRunner = proxyquire('~/src/TestRunner', {
    puppeteer: {
      launch: () => mockBrowser
    }
  })

  const testRunner = new TestRunner({
    testsGlob: 'someGlob'
  })

  t.context = {
    testRunner,
    mockBrowser,
    mockPage,
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
