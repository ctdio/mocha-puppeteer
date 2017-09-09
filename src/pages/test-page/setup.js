const { mocha, location } = window

// parse query to get mocha options
const hashData = location.hash.substring(1)
const { mochaOptions } = JSON.parse(hashData)

mocha.setup(mochaOptions)
