# mocha-puppeteer

Welcome to mocha-puppeteer! Since Google Chrome enabled headless mode in 59.x, the Chrome DevTools team has developed
[puppeteer](https://github.com/GoogleChrome/puppeteer) for running and managing an instance of Chromium. 
Mocha-puppeteer makes it possible to read tests written in
[Mocha](https://github.com/mochajs/mocha) and run them inside of a Chromium instance provided by puppeteer.
This way you get the ease-of-use and familiarity of Mocha along with the reliable performance of Chromium.


*Note:* Still under dev. Nothing is really configurable right now. Come back later.



## Installation

```
npm i -D mocha-puppeteer
```

# Usage

To run your tests, you can pass a glob to the exposed cli tool.

```
npx mocha-puppeteer ./tests/**/*.js
```