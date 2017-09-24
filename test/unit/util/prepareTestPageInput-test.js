const test = require('ava')
const sinon = require('sinon')

const proxyquire = require('proxyquire')
proxyquire.noPreserveCache()

const DEFAULT_LASSO_CONFIG = {
  outputDir: undefined,
  minify: false,
  bundlingEnabled: false,
  fingerprintsEnabled: false
}

const FIXTURES_PATH = `${process.cwd()}/test/unit/util/fixtures`

const ISTANBUL_CONFIG = Object.assign({}, DEFAULT_LASSO_CONFIG)
ISTANBUL_CONFIG.require = {
  transforms: [
    {
      transform: 'lasso-babel-transform',
      config: {
        babelOptions: {
          plugins: [ require.resolve('babel-plugin-istanbul') ]
        }
      }
    }
  ]
}

test.beforeEach((t) => {
  const sandbox = sinon.sandbox.create()

  const lasso = {
    create () {}
  }

  const mockLasso = sandbox.mock(lasso)

  const prepareTestPageInput = proxyquire('~/lib/utils/prepareTestPageInput', {
    lasso
  })

  t.context = {
    sandbox,
    lasso,
    mockLasso,
    prepareTestPageInput
  }
})

test.afterEach((t) => {
  const { sandbox } = t.context
  sandbox.restore()
})

test('should apply istanbul instrumentation to lassoConfig ' +
'if instrumentCode is true', (t) => {
  t.plan(0)
  const { mockLasso, prepareTestPageInput } = t.context

  mockLasso.expects('create').once().withArgs(ISTANBUL_CONFIG)

  prepareTestPageInput({
    testFiles: [],
    lassoConfig: {},
    instrumentCode: true
  })

  mockLasso.verify()
})

test('should NOT apply istanbul instrumentation to lassoConfig ' +
'if instrumentCode is false', (t) => {
  t.plan(0)
  const { mockLasso, prepareTestPageInput } = t.context

  const expectedConfig = Object.assign({}, DEFAULT_LASSO_CONFIG)
  mockLasso.expects('create').once().withArgs(expectedConfig)

  prepareTestPageInput({
    testFiles: [],
    lassoConfig: {},
    instrumentCode: false
  })

  mockLasso.verify()
})

test('should add istanbul instrumentation to lassoConfig ' +
'if instrumentCode is true and lassoConfig contains existing transforms', (t) => {
  t.plan(0)
  const { mockLasso, prepareTestPageInput } = t.context

  const fakeTransform = { transform: 'myTransform' }

  const expectedConfig = Object.assign({}, DEFAULT_LASSO_CONFIG)
  expectedConfig.require = {
    transforms: [
      fakeTransform,
      {
        transform: 'lasso-babel-transform',
        config: {
          babelOptions: {
            plugins: [ require.resolve('babel-plugin-istanbul') ]
          }
        }
      }
    ]
  }

  mockLasso.expects('create').once().withArgs(expectedConfig)

  prepareTestPageInput({
    testFiles: [],
    lassoConfig: {
      require: {
        transforms: [ fakeTransform ]
      }
    },
    instrumentCode: true
  })

  mockLasso.verify()
})

test('should add istanbul instrumentation to lassoConfig ' +
'if instrumentCode is true and lassoConfig contains requires but no existing transforms', (t) => {
  t.plan(0)
  const { mockLasso, prepareTestPageInput } = t.context

  mockLasso.expects('create').once().withArgs(ISTANBUL_CONFIG)

  prepareTestPageInput({
    testFiles: [],
    lassoConfig: {
      require: {}
    },
    instrumentCode: true
  })

  mockLasso.verify()
})

test('should resolve relative input dependencies', (t) => {
  const { prepareTestPageInput } = t.context

  const lassoDependencies = [
    'require: ./lib/TestRunner'
  ]

  const expectedPath = `${process.cwd()}/lib/TestRunner.js`

  const { dependencies } = prepareTestPageInput({
    testFiles: [],
    lassoDependencies
  })

  t.is(dependencies[0], `require: ${expectedPath}`)
})

test('should resolve relative input dependencies defined in object form', (t) => {
  const { prepareTestPageInput } = t.context

  const lassoDependencies = [
    {
      type: 'require',
      path: './lib/TestRunner'
    }
  ]

  const expectedPath = `${process.cwd()}/lib/TestRunner.js`

  const { dependencies } = prepareTestPageInput({
    testFiles: [],
    lassoDependencies
  })

  t.deepEqual(dependencies[0], {
    type: 'require',
    path: expectedPath
  })
})

test('should resolve relative input dependencies defined in object form', (t) => {
  const { prepareTestPageInput } = t.context

  const lassoDependencies = [ './lib/TestRunner' ]

  const expectedPath = `${process.cwd()}/lib/TestRunner.js`

  const { dependencies } = prepareTestPageInput({
    testFiles: [],
    lassoDependencies
  })

  t.is(dependencies[0], expectedPath)
})

test('should walk directories passed in as testFiles', (t) => {
  const { prepareTestPageInput } = t.context
  const testDir = `${FIXTURES_PATH}/test-directory`
  const expectedTestPath = `${testDir}/test.js`
  const expectedNestedTestPath = `${testDir}/nested-dir/test.js`

  const { dependencies } = prepareTestPageInput({
    testFiles: [ testDir ]
  })

  t.true(dependencies.indexOf(`require-run: ${expectedTestPath}`) > -1)
  t.true(dependencies.indexOf(`require-run: ${expectedNestedTestPath}`) > -1)
})

test('should be able to pick up both tests files and directories', (t) => {
  const { prepareTestPageInput } = t.context
  const nestedTestDir = `${FIXTURES_PATH}/test-directory/nested-dir`
  const expectedTestPath = `${nestedTestDir}/test.js`
  const directTestPath = `${FIXTURES_PATH}/test-directory/test.js`

  const { dependencies } = prepareTestPageInput({
    testFiles: [ nestedTestDir, directTestPath ]
  })

  t.true(dependencies.indexOf(`require-run: ${directTestPath}`) > -1)
  t.true(dependencies.indexOf(`require-run: ${expectedTestPath}`) > -1)
})

test('should only pick up files with commonly used js extensions (jsx, js, mjs, es6)', (t) => {
  const { prepareTestPageInput } = t.context
  const extensionsDir = `${FIXTURES_PATH}/extensions`
  const testFileBase = `${extensionsDir}/test`

  const es6TestPath = `${testFileBase}.es6`
  const jsTestPath = `${testFileBase}.js`
  const jsxTestPath = `${testFileBase}.jsx`
  const mjsTestPath = `${testFileBase}.mjs`

  const { dependencies } = prepareTestPageInput({
    testFiles: [ extensionsDir ]
  })

  t.true(dependencies.indexOf(`require-run: ${es6TestPath}`) > -1)
  t.true(dependencies.indexOf(`require-run: ${jsTestPath}`) > -1)
  t.true(dependencies.indexOf(`require-run: ${jsxTestPath}`) > -1)
  t.true(dependencies.indexOf(`require-run: ${mjsTestPath}`) > -1)
})
