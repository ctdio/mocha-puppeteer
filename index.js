// TODO: accept globs for pulling in test files,
// then pass them to lasso

require('marko/node-require').install()
require('lasso/node-require-no-op').enable('.less', '.css')

require('marko/browser-refresh').enable()
require('lasso/browser-refresh').enable('*.marko *.css *.less')

const puppeteer = require('puppeteer')

const marko = require('marko')
const lasso = require('lasso')

const testPageTemplate = marko.load(require('./pages/test-page'))

const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const serve = require('koa-static')
const mount = require('koa-mount')
const Router = require('koa-path-router')

let browser

const app = new Koa();
const router = new Router({
  middleware: [ bodyParser() ]
})


router.get('/', async (ctx) => {
  ctx.type = 'html'
  ctx.body = testPageTemplate.stream()
})

router.post('/end-test', async (ctx) => {
  browser && browser.close()

  const { testsPassed } = ctx.request.body
  testsPassed ? process.exit(0) : process.exit(1)
})

app.use(router.getRequestHandler())
app.use(mount('/static', serve('static')))

app.listen(8000, async () => {
  console.log('Server is listening on port 8000')

  browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  page.on('console', (...args) => {
    console.log(...args)
  })

  await page.goto('http://localhost:8000')
})
