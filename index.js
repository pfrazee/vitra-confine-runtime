const path = require('path')
const { ItoEsmIsolate } = require('./lib/isolate.js')
const { AbstractConfineRuntime } = require('abstract-confine-runtime')
const assert = require('assert').strict

module.exports = class ItoConfineRuntime extends AbstractConfineRuntime {
  constructor (opts) {
    super(opts)
    this.isolate = undefined
  }

  async init () {
    assert.ok(!this.opts.path || path.isAbsolute(this.opts.path), 'Path option must be an absolute path')
    assert.equal(typeof this.opts.env?.indexPubkey, 'string', 'env.indexPubkey option must be provided')
    assert.match(this.opts.env.indexPubkey, /^[0-9a-f]{64}$/i, 'env.indexPubkey option must be a 64 character hex string')
    if (this.opts.env.oplogPubkey) {
      assert.match(this.opts.env.oplogPubkey, /^[0-9a-f]{64}$/i, 'env.oplogPubkey option must be a 64 character hex string')
    }

    this.isolate = new ItoEsmIsolate(this.source.toString('utf-8'), {
      path: this.opts.path || '/ito-vm-virtual-path/index.js',
      globals: this.opts.globals,
      env: this.opts.env
    })
    this.isolate.on('closed', () => {
      this.emit('closed', this.isolate.exitCode || 0)
    })
    await this.isolate.init()
  }

  async run () {
    try {
      await this.isolate.run()
    } catch (e) {
      if (e.message === 'Isolate was disposed during execution') {
        // caused by process.exit(), ignore
        return
      }
      throw e
    }
  }

  async close () {
    this.isolate.close()
  }

  describeAPI () {
    return this.isolate.describeAPI()
  }

  async handleAPICall (methodName, params) {
    return this.isolate.handleAPICall(methodName, params)
  }
}
