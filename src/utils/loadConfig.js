/**
 * loads the .mocha-puppeteer-config file
 */
const path = require('path')
const CONFIG_FILE_NAME = '.mocha-puppeteer-config'

const fs = require('fs')
const { R_OK: READABLE } = fs.constants

const { promisify } = require('util')
const accessAsync = promisify(fs.access)

module.exports = async function _loadConfig ({ verbose } = {}) {
  let currentDirectory = process.cwd()

  let parentDirectory
  let config
  let configPath

  while (!configPath && (currentDirectory !== parentDirectory)) {
    parentDirectory = currentDirectory

    if (currentDirectory === '/') {
      currentDirectory = ''
    }

    try {
      const path = `${currentDirectory}/${CONFIG_FILE_NAME}`
      await accessAsync(path, READABLE)
      configPath = path
    } catch (err) {
      verbose && console.log(`No config found in ${currentDirectory}`)
      currentDirectory = path.dirname(currentDirectory)
    }
  }

  if (configPath) {
    try {
      config = require(configPath)
    } catch (err) {
      console.error(err)
      throw new Error(`Unable to load config at ${configPath}`, err)
    }
  }

  return config
}
