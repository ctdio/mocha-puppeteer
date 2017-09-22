describe('screenshot test', function () {
  it('should allow sending screenshot command to puppeteer', async () => {
    await window.puppeteerCommand({
      type: 'screenshot',
      args: [ {
        path: './test/integration/mocha/static/test.png'
      } ]
    })
  })
})
