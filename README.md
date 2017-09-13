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

You can also just pass in a directory containing all of the tests you want to run.

```bash
npx mocha-puppeteer ./tests
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

   Test using Chromium args: "mocha-puppeteer /foo/bar-test.js --args account-consistency browser-startup-dialog"

Options:

             --help -h Show this help message [string]

          --version -v Show the version number of mocha-puppeteer [string]

     --testPagePath -P Path to a custom Marko test page [string]

        --pattern -p * Pattern to run tests. Either a single file or glob pattern. [string]

         --reporter -r The mocha test reporter to use. (Defaults to "spec") [string]

        --useColors -c Whether use colors for test output. (Defaults to true) [boolean]

               --ui -u The mocha ui to use. (Defaults to "bdd") [string]

--ignoreHTTPSErrors -i Whether to ignore HTTPS errors during navigation. Defaults to false. [boolean]

         --headless -H Whether to run Chromium in headless mode. Defaults to true. [boolean]

   --executablePath -e Path to a Chromium executable to run instead of bundled Chromium. If executablePath is a relative path, then it is resolved relative to current working directory. [string]

           --slowMo -s Slows down Puppeteer operations by the specified amount of milliseconds. Useful so that you can see what is going on. [number]

             --args -a Additional arguments to pass to the Chromium instance. List of Chromium flags can be found at https://peter.sh/experiments/chromium-command-line-switches/. [string]

     --handleSIGINT -S Close chrome process on Ctrl-C. Defaults to true. [boolean]

 --puppeteerTimeout -t Maximum time in milliseconds to wait for the Chrome instance to start. Defaults to 30000 (30 seconds). Pass 0 to disable timeout. [number]

           --dumpio -d Whether to pipe browser process stdout and stderr into process.stdout and process.stderr. Defaults to false. [boolean]

      --userDataDir -D Path to a User Data Directory. [string]

--puppeteerPageTimeout Maximum time in milliseconds to wait for the page to load [number]
```

> NOTE: To use `args` [Chromium flags](https://peter.sh/experiments/chromium-command-line-switches/), do not supply the prefixed double dash.
> Example of using `args`:
> `mocha-puppeteer /foo/bar-test.js --args account-consistency browser-startup-dialog`

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

## Executing page commands from tests

[`puppeteer` page commands](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page)
can be executed using `window.puppeteerCommand` from your tests. For example,
if you want to take a screenshot of the page:

```js
describe('screenshot test', function () {
  it('should take a screenshot', async () => {
    await window.puppeteerCommand({
      type: 'screenshot', // The page command to run
      args: [ {           // The arguments that should be passed to the page command
        path: './test.png'
      } ]
    })
  })
})
```

## Advanced Usage

If you need to customize the page that is sent to the browser with your Mocha
test code, you can do so, by specifiying a `--testPagePath` CLI option.
`mocha-puppeteer` uses [Marko.js](https://github.com/marko-js/marko) for
templating and [Lasso](https://github.com/lasso-js/lasso) to bundle browser
dependencies. Provide a path to a Marko template similar to the following:

**/my-proj/test-page.marko**

```marko
lasso-page [
  dependencies=input.dependencies
  lasso=input.lasso
]

<!DOCTYPE html>
html
  head
    lasso-head
  body
    div id='mocha'
    lasso-body
```

## Contributing

If you find a bug or have an idea about how to improve the module, please create an issue. If you have a fix
for a bug, feel free to submit a pull request.

You can run tests with the `npm test` command.

## Credits

- [Smashicons](https://www.flaticon.com/authors/smashicons)
- [Flaticon](https://www.flaticon.com/)
