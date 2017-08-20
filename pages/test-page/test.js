const assert = require('assert')

describe('testing', () => {
  describe('some suite', () => {
    it('should skip this test')

    it('should pass this test', () => {
      assert(1 + 1 === 2)
    })
  })

  it('should fail this test', () => {
    throw new Error('Some error occurred')
  })
})
