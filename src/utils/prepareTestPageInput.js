const lasso = require('lasso')
const path = require('path')

const DEFAULT_LASSO_CONFIG = {
  minify: false,
  bundlingEnabled: false,
  fingerprintsEnabled: false
}

const ISTANBUL_LASSO_CONFIG_ADDON = {
  require: {
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
}

module.exports = function _prepareTestPageInput (options) {
  const {
    outputDir,
    instrumentCode,
    lassoConfig,
    testFiles
  } = options

  const fullConfig = Object.assign({ outputDir },
    DEFAULT_LASSO_CONFIG,
    instrumentCode && ISTANBUL_LASSO_CONFIG_ADDON,
    lassoConfig)

  const pageLasso = lasso.create(fullConfig)

  const tests = testFiles.map((file) =>
    `require-run: ${require.resolve(path.resolve(file))}`)

  const dependencies = [
    'mocha/mocha.css',
    'mocha/mocha.js',
    'superagent/superagent.js',
    `require-run: ${require.resolve('../pages/test-page/setup')}`,

    // inject tests
    ...tests,

    `require-run: ${require.resolve('../pages/test-page/run-tests')}`
  ]

  return {
    pageLasso,
    dependencies
  }
}
