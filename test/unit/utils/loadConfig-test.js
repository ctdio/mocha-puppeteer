const test = require('ava')

const proxyquire = require('proxyquire')
proxyquire.noPreserveCache()

const uuid = require('uuid')
const path = require('path')

const TEST_CWD = '/home/projects/open-source/mocha-puppeteer/test/fixtures'
const CONFIG_NAME = '.mocha-puppeteer-config.js'

test.beforeEach('setup testConfig', (t) => {
  const testConfig = {
    '@noCallThru': true, // add no call thru for proxyquire
    [ uuid.v4() ]: uuid.v4()
  }

  t.context = { testConfig }
})

async function _testLoadConfig ({ t, mockConfigPath, testConfig, expected }) {
  const loadConfig = proxyquire('~/src/utils/loadConfig', {
    fs: {
      access (path, mode, callback) {
        if (path === mockConfigPath) {
          callback()
        } else {
          callback(new Error('No access'))
        }
      }
    },

    [ mockConfigPath ]: Object.assign(testConfig)
  })

  const config = await loadConfig({
    startingDirectory: TEST_CWD,
    verbose: true
  })

  t.is(config, expected)
}

test('should be able to load a config from the current working directory', async (t) => {
  const { testConfig } = t.context

  const mockConfigPath = `${TEST_CWD}/${CONFIG_NAME}`
  return _testLoadConfig({ t, mockConfigPath, testConfig, expected: testConfig })
})

test('should be able to load a config from a parent directory', async (t) => {
  const { testConfig } = t.context

  const parentCwd = path.dirname(TEST_CWD)
  const mockConfigPath = `${parentCwd}/${CONFIG_NAME}`

  return _testLoadConfig({ t, mockConfigPath, testConfig, expected: testConfig })
})

test('should be able to load a config multiple directories up', async (t) => {
  const { testConfig } = t.context

  let parentCwd = path.dirname(TEST_CWD)
  parentCwd = path.dirname(parentCwd)
  const mockConfigPath = `${parentCwd}/${CONFIG_NAME}`

  return _testLoadConfig({ t, mockConfigPath, testConfig, expected: testConfig })
})

test('should return undefined if unable to find a config', async (t) => {
  const { testConfig } = t.context
  const mockConfigPath = `${TEST_CWD}/someDir/${CONFIG_NAME}`

  return _testLoadConfig({ t, mockConfigPath, testConfig, expected: undefined })
})

test('should throw an error if failed to load config', async (t) => {
  t.plan(1)

  const mockConfigPath = `${TEST_CWD}/${CONFIG_NAME}`

  // don't expose the config as a module
  const loadConfig = proxyquire('~/src/utils/loadConfig', {
    fs: {
      access (path, mode, callback) {
        if (path === mockConfigPath) {
          callback()
        } else {
          callback(new Error('No access'))
        }
      }
    }
  })

  try {
    await loadConfig({
      startingDirectory: TEST_CWD
    })
  } catch (err) {
    t.true(err.message.includes('Unable to load config'))
  }
})
