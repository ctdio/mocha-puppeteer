const lasso = require('lasso')
const path = require('path')

const DEFAULT_LASSO_CONFIG = {
  minify: false,
  bundlingEnabled: false,
  fingerprintsEnabled: false
}

const ISTANBUL_LASSO_TRANSFORM_ADDON = {
  transform: 'lasso-babel-transform',
  config: {
    babelOptions: {
      plugins: [ require.resolve('babel-plugin-istanbul') ]
    }
  }
}

function _buildConfig ({ outputDir, inputConfig, instrumentCode }) {
  const config = Object.assign({ outputDir },
    DEFAULT_LASSO_CONFIG,
    inputConfig)

  if (instrumentCode) {
    if (config.require) {
      if (config.require.transforms) {
        config.require.transforms.push(ISTANBUL_LASSO_TRANSFORM_ADDON)
      } else {
        config.require.transforms = [ ISTANBUL_LASSO_TRANSFORM_ADDON ]
      }
    } else {
      config.require = {
        transforms: [ ISTANBUL_LASSO_TRANSFORM_ADDON ]
      }
    }
  }

  return config
}

module.exports = function _prepareTestPageInput (options) {
  const {
    outputDir,
    instrumentCode,
    lassoConfig: inputConfig,
    testFiles
  } = options

  const fullConfig = _buildConfig({
    outputDir,
    inputConfig,
    instrumentCode
  })

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
