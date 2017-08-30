# mocha-puppeteer

[![Build Status](https://travis-ci.org/charlieduong94/mocha-puppeteer.svg?branch=master)](https://travis-ci.org/charlieduong94/mocha-puppeteer)
[![Coverage Status](https://coveralls.io/repos/github/charlieduong94/mocha-puppeteer/badge.svg?branch=master)](https://coveralls.io/github/charlieduong94/mocha-puppeteer?branch=master)


Since the release of Google Chrome headless mode, the Chrome DevTools team has developed
[puppeteer](https://github.com/GoogleChrome/puppeteer) for running and managing an instance of Chromium.
This module makes it possible to run tests written with
[mocha](https://github.com/mochajs/mocha) inside of a Chromium instance.


*Note:* Still under dev. Nothing is really configurable right now. Come back later.

## Installation

```
npm i -D mocha-puppeteer
```

## Usage

To run your tests, you can pass in the test files to the exposed cli tool. A glob works too depending
on the shell you are using.

```
npx mocha-puppeteer ./tests/*.js
```

## Contributing

If you find a bug or have an idea about how to improve the module, please create an issue. If you have a fix
for a bug, feel free to submit a pull request.

You can run tests with the `npm test` command.
