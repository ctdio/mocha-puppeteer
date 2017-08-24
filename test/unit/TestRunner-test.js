require('require-self-ref')

const test = require('ava')

const sinon = require('sinon')
const proxyquire = require('proxyquire')
proxyquire.noPreserveCache()

// const superagent = require('superagent')

const EventEmitter = require('events')

class MockPage extends EventEmitter {
  goto () {}
}

test.beforeEach('setup mocks and test runner', (t) => {
  const sandbox = sinon.sandbox.create()

  const mockPage = new MockPage()

  const mockBrowser = {
    newPage: () => mockPage
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

test('should direct puppeteer page to "goto" the root path of the server that is launched', async (t) => {
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
