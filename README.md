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

    --reporter The mocha test reporter to use. (Defaults to "spec") [string]

   --useColors Whether use colors for test output. (Defaults to true) [boolean]

          --ui The mocha ui to use. (Defaults to "bdd") [string]

```

## Configuring the test file
You can configure `mocha-puppeteer` with a `.mocha-puppeteer-config.js` file.

Example config file:

```js
require('require-self-ref')

module.exports = {
  lassoConfig: {
    require: {
      transforms: [
        {
          transform: require('lasso-babel-transform'),
          config: {
            extensions: ['.js', '.es6']
          }
        }
      ]
    }
  }
}
```

You can also get test coverage information using `nyc`

```bash
npx nyc mocha-puppeteer ./test/*.js
```

## Configuring tests
You can configure `mocha-puppeteer` with a `.mocha-puppeteer-config.js` file.

Example config file:

```js
require('require-self-ref')

module.exports = {
  lassoConfig: {
    require: {
      transforms: [
        {
          transform: require('lasso-babel-transform'),
          config: {
            extensions: ['.js', '.es6']
          }
        }
      ]
    }
  }
}
```

At the moment, only options for configuring `lasso` are supported with the `lassoConfig` field.
Babel transforms can be applied using the [lasso-babel-transform](https://github.com/lasso-js/lasso-babel-transform) module.

## Contributing

If you find a bug or have an idea about how to improve the module, please create an issue. If you have a fix
for a bug, feel free to submit a pull request.

You can run tests with the `npm test` command.

## Credits

- [Smashicons](https://www.flaticon.com/authors/smashicons)
- [Flaticon](https://www.flaticon.com/)
