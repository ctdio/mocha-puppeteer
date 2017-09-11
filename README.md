# mocha-puppeteer

<p align="center">
  <img src="./logos/mocha-puppeteer.png" alt="mocha-puppeteer logo" width="300" />
</p>

[![Build Status](https://travis-ci.org/charlieduong94/mocha-puppeteer.svg?branch=master)](https://travis-ci.org/charlieduong94/mocha-puppeteer)
[![Coverage Status](https://coveralls.io/repos/github/charlieduong94/mocha-puppeteer/badge.svg?branch=master)](https://coveralls.io/github/charlieduong94/mocha-puppeteer?branch=master)


Since the release of Google Chrome headless mode, the Chrome DevTools team has developed
[puppeteer](https://github.com/GoogleChrome/puppeteer) for running and managing an instance of Chromium.
This module makes it possible to easily run tests written with [mocha](https://github.com/mochajs/mocha)
inside of a Chromium instance. Module bundling is automatically handled using
[lasso](https://github.com/lasso-js/lasso).

<p align='center'>
  <img src='https://media.giphy.com/media/3ov9k8gttSM4buyZna/giphy.gif'/>
</p>

## Installation

```bash
npm i -D mocha-puppeteer
```

## Usage

Write your tests like you normally would with mocha.

```js
const assert = require('assert')

describe('my test', () => {
  it('should pass', () => {
    assert(1 + 1 === 2)
  })
})
```

To run your tests, you can pass in the test files to the exposed cli tool. A glob works too depending
on the shell you are using.

```bash
npx mocha-puppeteer ./tests/dirA/*.js ./test/dirB/*.js
```

You can also get test coverage information using `nyc`

```bash
npx nyc mocha-puppeteer ./test/*.js
```

All available options:

```
Usage: mocha-puppeteer [OPTIONS]

Examples:

   Test a single file: "mocha-puppeteer /foo/bar-test.js"

   Test a series of files using a glob pattern: "mocha-puppeteer /foo/*/*-test.js"

Options:

     --help -h Show this help message [string]

  --version -v Show the version number of mocha-puppeteer [string]

--pattern -p * Pattern to run tests. Either a single file or glob pattern. [string]

 --reporter -r The mocha test reporter to use. (Defaults to "spec") [string]

--useColors -c Whether use colors for test output. (Defaults to true) [boolean]

       --ui -u The mocha ui to use. (Defaults to "bdd") [string]
```

## Configuring the test file
You can configure `mocha-puppeteer` with a `.mocha-puppeteer-config.js` file.

Example config file:

```js
require('require-self-ref')

module.exports = {
  mochaOptions: {
    reporter: 'nyan'
  },

  lassoConfig: {
    require: {
      transforms: [
        {
          transform: 'lasso-babel-transform'
        }
      ]
    }
  },

  lassoDependencies: [
    'src/theme/browser.json'
  ]
}
```

You can also get test coverage information using `nyc`

```bash
npx nyc mocha-puppeteer ./test/*.js
```

At the moment, you can specify `mochaOptions`, `lassoConfig`, and `lassoDependencies`. `lassoDependencies` will be included before
test files. So any globals
Babel transforms can be applied using the [lasso-babel-transform](https://github.com/lasso-js/lasso-babel-transform) module.

Note: Values provided in the `mochaOptions` field will be overridden by cli arguments.
For example, `mocha-puppeteer test/test.js --reporter dot` will override the `reporter` option in the
above config.

## Contributing

If you find a bug or have an idea about how to improve the module, please create an issue. If you have a fix
for a bug, feel free to submit a pull request.

You can run tests with the `npm test` command.

## Credits

- [Smashicons](https://www.flaticon.com/authors/smashicons)
- [Flaticon](https://www.flaticon.com/)
