'use strict'

/* globals describe, it */

var assert = require('assert')
var chain = require('connect-chain-if')
var mock = require('../index')

describe('#mock', function () {
  this.timeout(200)

  it('call with empty req and res', function (done) {
    var req = {}
    var res = {}

    chain([
      mock
    ])(req, res, function () {
      assert.strictEqual(req.url, '/')
      assert.strictEqual(res.headersSent, false)
      assert.strictEqual(res.statusCode, undefined)
      done()
    })
  })

  it('set response header', function (done) {
    var req = {
      headers: {
        userAgent: 'Mozilla/5.0 (Awesome/1.0)'
      }
    }
    var res = {}

    chain([
      mock,
      function (req, res, next) {
        res.setHeader('Set-Cookie', ['test=1', 'language=de'])
        next()
      }
    ])(req, res, function () {
      assert.strictEqual(req.url, '/')
      assert.strictEqual(req.headers.userAgent, 'Mozilla/5.0 (Awesome/1.0)')
      assert.deepStrictEqual(res.getHeader('set-cookie'), ['test=1', 'language=de'])
      assert.strictEqual(res.headersSent, false)
      done()
    })
  })

  it('call response end', function (done) {
    var req = {
      headers: {
        userAgent: 'Mozilla/5.0 (Awesome/1.0)'
      }
    }
    var res = {}

    chain([
      mock,
      function (req, res, next) {
        res.end()
        next && next()
      }
    ])(req, res, function () {
      assert.strictEqual(req.url, '/')
      assert.strictEqual(req.headers.userAgent, 'Mozilla/5.0 (Awesome/1.0)')
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
      done()
    })
  })

  it('write response', function (done) {
    var req = {}
    var res = {}

    chain([
      mock,
      function (req, res, next) {
        res.writeHead(200)
        res.write('this is a test')
        res.end()
        next && next()
      }
    ])(req, res, function () {
      assert.strictEqual(req.url, '/')
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
      assert.strictEqual(res.getBuffer(), 'this is a test')
      done()
    })
  })

  it('pipe', function (done) {
    var req = {}
    var res = {}

    chain([
      mock,
      function (req, res, next) {
        require('fs').createReadStream(__filename)
          .pipe(res)
          .on('finish', function () {
            next()
          })
      }
    ])(req, res, function () {
      assert.strictEqual(req.url, '/')
      assert.strictEqual(res.headersSent, true)
      assert.strictEqual(res.statusCode, 200)
      assert.strictEqual(res.getBuffer().substr(0, 12), "'use strict'")
      done()
    })
  })
})

describe('example', function () {
  // a middleware function under test
  var middleware = function (req, res, next) {
    var regex = /^(?:\/test)(\/.*|$)/
    req.params = ''

    req.on('data', function (data) {
      req.params += data // a simple body parser
    })
    req.on('end', function () {
      if (regex.test(req.url)) {
        req.url = req.url.replace(regex, '$1') || '/'
        res.writeHead(200, { 'Cache-Control': 'max-age=300' })
        res.write('this is a test')
        res.end()
      } else {
        next && next()
      }
    })
  }
  it('shall respond with a 200', function (done) {
    var req = new mock.Request({
      url: '/test',
      method: 'POST',
      buffer: Buffer.from('name=mock&version=first')
    })
    var res = new mock.Response({
      onEnd: function () {
        // the test ends here
        assert.strictEqual(req.url, '/')
        assert.strictEqual(req.params, 'name=mock&version=first')
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(res.headersSent, true)
        assert.strictEqual(res.getHeader('Cache-Control'), 'max-age=300')
        assert.strictEqual(res.hasEnded(), true)
        done()
      }
    })
    middleware(req, res, function () {
      assert.strictEqual('test never', 'reaches here')
    })
  })
  it('shall call next middleware', function (done) {
    var req = new mock.Request({
      url: '/other',
      method: 'POST',
      buffer: Buffer.from('name=mock&version=first')
    })
    var res = new mock.Response({
      onEnd: function () {
        assert.strictEqual('test never', 'reaches here')
      }
    })
    middleware(req, res, function () {
      // the test ends here
      assert.strictEqual(req.url, '/other')
      assert.strictEqual(res.headersSent, false)
      assert.strictEqual(res.hasEnded(), false)
      done()
    })
  })
})
