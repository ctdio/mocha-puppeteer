require('require-self-ref')

const test = require('ava')
const { runTests } = require('~/index')

test('#runTests should resolve for passing tests', async (t) => {
  try {
    await runTests({
      testFiles: [ require.resolve('./fixtures/passing-test.js') ],
      _instrumentCode: false
    })
    t.pass()
  } catch (err) {
    t.fail(err)
  }
})

test('#runTests should reject for failing tests', async (t) => {
  try {
    await runTests({
      testFiles: [ require.resolve('./fixtures/failing-test.js') ],
      _instrumentCode: false
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
      testFiles: [ 'non existant test file' ]
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
      testFiles: [] // no test files will cause mocha runner to timeout
    })
    t.fail()
  } catch (err) {
    console.log(err)
    t.pass(err)
  }
})
