const lasso = require('lasso')
const path = require('path')
const { statSync } = require('fs')
const { walkSync } = require('fs-walk')
const resolveFrom = require('resolve-from')

const TEST_FILE_EXTENSIONS = {}
;[ 'js', 'jsx', 'es6', 'mjs' ].map((extension) => {
  TEST_FILE_EXTENSIONS[extension] = true
})

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

// adapted from marko-cli
function _resolveDependencies (inputDependencies) {
  return inputDependencies.map((dependency) => {
    let path

    if (typeof dependency === 'string') {
      let type
      [ type, path ] = dependency.split(':').map((str) => str.trim())

      if (!path) {
        path = type
        type = null
      }

      path = resolveFrom(process.cwd(), path)

      dependency = type ? `${type}: ${path}` : path
    } else if ((path = dependency.path)) {
      dependency.path = resolveFrom(process.cwd(), path)
    }

    return dependency
  })
}

function _buildTestFiles (inputTestFiles) {
  const testFiles = []

  inputTestFiles.map((testFile) => {
    const filePath = path.resolve(process.cwd(), testFile)
    const stat = statSync(filePath)

    if (stat.isDirectory()) {
      walkSync(filePath, (baseDir, fileName, stat) => {
        if (stat.isFile()) {
          const extension = fileName.substring(fileName.lastIndexOf('.') + 1)

          if (TEST_FILE_EXTENSIONS[extension]) {
            testFiles.push(`require-run: ${path.join(baseDir, fileName)}`)
          }
        }
      })
    } else if (stat.isFile()) {
      testFiles.push(`require-run: ${filePath}`)
    }
  })

  return testFiles
}

module.exports = function _prepareTestPageInput (options) {
  const {
    outputDir,
    instrumentCode,
    lassoConfig: inputConfig,
    testFiles
  } = options

  let {
    lassoDependencies: inputDependencies
  } = options

  inputDependencies = inputDependencies
    ? _resolveDependencies(inputDependencies)
    : []

  const fullConfig = _buildConfig({
    outputDir,
    inputConfig,
    instrumentCode
  })

  const pageLasso = lasso.create(fullConfig)

  const tests = _buildTestFiles(testFiles)

  const dependencies = inputDependencies.concat([
    'mocha/mocha.css',
    'mocha/mocha.js',
    'superagent/superagent.js',
    `require-run: ${require.resolve('../pages/test-page/setup')}`,

    // inject tests
    ...tests,

    `require-run: ${require.resolve('../pages/test-page/run-tests')}`
  ])

  return {
    pageLasso,
    dependencies
  }
}
