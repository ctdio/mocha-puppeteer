const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const fsUnlinkAsync = promisify(fs.unlink)
const fsStatAsync = promisify(fs.stat)
const test = require('ava')
const { runTests } = require('~/index')

test('#runTests should resolve for passing tests', async (t) => {
  try {
    await runTests({
      testFiles: [ require.resolve('./fixtures/passing-test.js') ],
      _instrumentCode: false,
      _randomizeOutputDir: true
    })
    t.pass()
  } catch (err) {
    t.fail(err)
  }
})

test('#runTests should allow taking screenshot from tests', async (t) => {
  const imgPath = path.resolve(__dirname, 'static', 'test.png')

  try {
    await runTests({
      testFiles: [ require.resolve('./fixtures/screenshot-test.js') ],
      _instrumentCode: false,
      _randomizeOutputDir: true
    })

    await fsStatAsync(imgPath)
    await fsUnlinkAsync(imgPath)
    t.pass()
  } catch (err) {
    t.fail(err)
  }
})

test('#runTests should reject for failing tests', async (t) => {
  try {
    await runTests({
      testFiles: [ require.resolve('./fixtures/failing-test.js') ],
      _instrumentCode: false,
      _randomizeOutputDir: true
    })
    t.fail()
  } catch (err) {
    console.log(err)
    t.pass(err)
  }
})

test('#runTests should reject if unable to resolve test files', async (t) => {
  try {
    await runTests({
      testFiles: [ 'non existant test file' ],
      _instrumentCode: false,
      _randomizeOutputDir: true
    })
    t.fail()
  } catch (err) {
    console.log(err)
    t.pass(err)
  }
})

test('#runTests should reject if error occurs during test', async (t) => {
  try {
    await runTests({
      testFiles: [], // no test files will cause mocha runner to timeout
      _instrumentCode: false,
      _randomizeOutputDir: true
    })
    t.fail()
  } catch (err) {
    console.log(err)
    t.pass(err)
  }
})

test('#runTests should allow using a custom Marko template', async (t) => {
  try {
    await runTests({
      testFiles: [ require.resolve('./fixtures/passing-test.js') ],
      testPage: require('./fixtures/test-page'),
      _instrumentCode: false,
      _randomizeOutputDir: true
    })
    t.pass()
  } catch (err) {
    t.fail(err)
  }
})
