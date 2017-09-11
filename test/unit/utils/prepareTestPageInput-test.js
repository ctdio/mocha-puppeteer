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

  const prepareTestPageInput = proxyquire('~/src/utils/prepareTestPageInput', {
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
    'require: ./src/TestRunner'
  ]

  const expectedPath = `${process.cwd()}/src/TestRunner.js`

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
      path: './src/TestRunner'
    }
  ]

  const expectedPath = `${process.cwd()}/src/TestRunner.js`

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

  const lassoDependencies = [ './src/TestRunner' ]

  const expectedPath = `${process.cwd()}/src/TestRunner.js`

  const { dependencies } = prepareTestPageInput({
    testFiles: [],
    lassoDependencies
  })

  t.is(dependencies[0], expectedPath)
})
