const JsisolateConfineRuntime = require('jsisolate-confine-runtime')
const { MethodNotFound } = require('abstract-confine-runtime')
const ivm = require('@andrewosh/isolated-vm')
const { EsmIsolate } = require('jsisolate-confine-runtime/lib/isolate.js')
const path = require('path')
const uuid = require('uuid')
const assert = require('assert').strict

class ItoEsmIsolate extends EsmIsolate {
  constructor (source, opts) {
    super(source, opts)
    this.indexPubkey = opts.ito.indexPubkey
    this.oplogPubkey = opts.ito.oplogPubkey
  }

  async _configureEnvironment () {
    await super._configureEnvironment()
    const context = this.context

    await context.global.delete('eval')
    await context.global.delete('Atomics')
    await context.global.delete('WebAssembly')
    await context.global.delete('Function')
    await context.global.delete('AsyncFunction')

    const attachGlobalFn = async (name, func) => {
      await context.evalClosure(`global.${name} = function (...args) {
        return $0.applySync(undefined, args, { result: { promise: false, copy: true }, arguments: { copy: true } })
      }`, [new ivm.Reference(func)], { result: { copy: true }, arguments: { copy: true } })
    }

    await context.eval(`
      ${CONTRACT_INDEX_CLS}
      ${CONTRACT_OPLOG_CLS}
      global.index = new ContractIndex("${this.indexPubkey}")
      ${typeof this.oplogPubkey === 'string' ? `
      global.oplog = new ContractOplog("${this.oplogPubkey}")
      ` : ''}
    `)
    await attachGlobalFn('genUUID', uuid.v4)
    await attachGlobalFn('assert', assert)
    await attachGlobalFn('assert.deepEqual', assert.deepEqual)
    await attachGlobalFn('assert.doesNotMatch', assert.doesNotMatch)
    await attachGlobalFn('assert.equal', assert.equal)
    await attachGlobalFn('assert.fail', assert.fail)
    await attachGlobalFn('assert.match', assert.match)
    await attachGlobalFn('assert.notDeepEqual', assert.notDeepEqual)
    await attachGlobalFn('assert.notEqual', assert.notEqual)
  }

  async handleAPICall (methodName, params) {
    if (methodName === 'apply') {
      // apply has special parameters and must be handled differently
      const methodRef = this.module.namespace.getSync('apply', {reference: true})
      if (methodRef?.typeof === 'function') {
        const {actions, tx} = createApplyTransactor()
        await methodRef.apply(null, [tx, params[0], params[1]], {
          arguments: { copy: true },
          result: { promise: true, copy: true }
        })
        return {actions}
      } else {
        throw new MethodNotFound(`Method not found: ${methodName}`)
      }
    } else {
      return super.handleAPICall(methodName, params)
    }
  }
}

module.exports = class ItoConfineRuntime extends JsisolateConfineRuntime {
  async init () {
    assert.ok(!this.opts.path || path.isAbsolute(this.opts.path), 'Path option must be an absolute path')
    assert.equal(typeof this.opts.ito?.indexPubkey, 'string', 'indexPubkey option must be provided')
    assert.match(this.opts.ito.indexPubkey, /^[0-9a-f]{64}$/i, 'indexPubkey option must be a 64 character hex string')
    if (this.opts.ito.oplogPubkey) {
      assert.match(this.opts.ito.oplogPubkey, /^[0-9a-f]{64}$/i, 'oplogPubkey option must be a 64 character hex string')
    }

    this.isolate = new ItoEsmIsolate(this.source.toString('utf-8'), {
      path: this.opts.path || '/tmp/script.js',
      env: 'vanilla',
      ito: this.opts.ito,
      globals: this.opts.globals,
      disableImports: true
    })
    this.isolate.on('closed', () => {
      this.emit('closed', this.isolate.exitCode || 0)
    })
    await this.isolate.open()
  }
}

const CONTRACT_INDEX_CLS = `
{
  const __contractIndexAPI = global.__contractIndexAPI
  class ContractIndex {
    constructor (pubkey) {
      this.pubkey = pubkey
    }
    async list (...args) {
      return __contractIndexAPI.list(this.pubkey, ...args)
    }
    async get (...args) {
      return __contractIndexAPI.get(this.pubkey, ...args)
    }
    async listOplogs (...args) {
      return __contractIndexAPI.listOplogs(this.pubkey, ...args)
    }
  }
  global.ContractIndex = ContractIndex
  delete global.__contractIndexAPI
}
`

const CONTRACT_OPLOG_CLS = `
{
  const __contractOplogAPI = global.__contractOplogAPI
  class ContractOplog {
    constructor (pubkey) {
      this.pubkey = pubkey
    }
    async getLength (...args) {
      return __contractOplogAPI.getLength(this.pubkey, ...args)
    }
    async get (...args) {
      return __contractOplogAPI.get(this.pubkey, ...args)
    }
    async append (...args) {
      return __contractOplogAPI.append(this.pubkey, ...args)
    }
  }
  global.ContractOplog = ContractOplog
  delete global.__contractOplogAPI
}
`

function normalizeKey (key) {
  assert(key, 'A key string parameter must be supplied')
  assert.equal(typeof key, 'string', 'A key string parameter must be supplied')
  if (!key.startsWith('/')) {
    key = '/' + key
  }
  while (key.endsWith('/')) {
    key = key.slice(0, -1)
  }
  assert(key.length > 0, 'Cannot modify /')
  return key
}

function assertUnprotectedKey (key) {
  assert(!key.startsWith('/.sys/'), 'Cannot modify values with /.sys/ prefix')
}

function createApplyTransactor () {
  const actions = {}
  return {
    actions,
    tx: {
      get: new ivm.Callback((key) =>{
        key = normalizeKey(key)
        return actions[key]
      }),

      put: new ivm.Callback((key, value) => {
        key = normalizeKey(key)
        assertUnprotectedKey(key)
        actions[key] = {type: 'put', value}
      }),

      delete: new ivm.Callback((key) =>{
        key = normalizeKey(key)
        assertUnprotectedKey(key)
        actions[key] = {type: 'delete'}
      }),

      addContractOplog: new ivm.Callback((opts) => {
        assert.match(opts?.pubkey, /^[0-9a-f]{64}$/, 'Must pass a valid {pubkey} string to addContractOplog')
        actions['/.sys/inputs/' + opts.pubkey] = {type: 'put', value: {pubkey: opts.pubkey}}
      }),

      removeContractOplog: new ivm.Callback((opts) => {
        assert.match(opts?.pubkey, /^[0-9a-f]{64}$/, 'Must pass a valid {pubkey} string to removeContractOplog')
        actions['/.sys/inputs/' + opts.pubkey] = {type: 'delete'}
      }),

      setContractSource: new ivm.Callback((opts) => {
        assert(typeof opts?.code === 'string', 'Must pass a valid {code} string to setContractSource')
        actions['/.sys/contract/source'] = {type: 'put', value: opts.code}
      }),
    }
  }
}
