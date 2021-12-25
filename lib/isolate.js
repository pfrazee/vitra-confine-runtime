const EventEmitter = require('events')
const { APIDescription, APIObject, APIMethod, MethodNotFound } = require('abstract-confine-runtime')
const ivm = require('@andrewosh/isolated-vm')
const ImportController = require('./imports')
const uuid = require('uuid')
const assert = require('assert').strict
const lock = require('./lock')
const { addSyncGlobal, addAsyncGlobal, addConstGlobal } = require('./vm-util')
const { createApplyTransactor } = require('./guest-apis/apply')
const { createEmitFn } = require('./guest-apis/emit')

const DISALLOWED_RESTRICTED_METHODS = [
]

exports.ItoEsmIsolate = class ItoEsmIsolate extends EventEmitter {
  constructor (source, opts = {}) {
    super()
    this.source = source
    this.isolate = new ivm.Isolate(opts)
    this.context = undefined
    this.module = null
    this.exitCode = undefined

    this.opened = false
    this.closed = false

    this.restricted = opts.restricted || false
    this._importController = null
    this._globals = this._wrapGlobals(opts.globals || {})
    this._indexPubkey = opts.env.indexPubkey
    this._oplogPubkey = opts.env.oplogPubkey
  }

  async init () {
    if (this.opened) return
    this.opened = true
    const context = await this.isolate.createContext()
    const jail = context.global
    await jail.set('global', jail.derefInto())
    this.context = context
    
    await this._configureEnvironment()
    this.module = await this.isolate.compileModule(this.source)
    this._importController = new ImportController(this.isolate, this._globals?.__internal__?.sys?.readSourceFile)
  }

  async run () {
    if (!this.opened) await this.init()
    await this.module.instantiate(this.context, this._importController.resolve.bind(this._importController))
    await this.module.evaluate()
  }

  async close () {
    if (!this.opened) return
    if (this.closed) return
    this.closed = false
    this.module?.release?.()
    this.isolate?.dispose()
    this.emit('closed')
  }

  configure (opts) {
    if ('restricted' in opts) {
      this.restricted = opts.restricted
    }
  }

  describeAPI () {
    // TODO: we need to figure out a way to enumerate the keys in `this.module.namespace`
    return new APIDescription([])
  }

  async handleAPICall (methodName, params) {
    return await this._restrictedGuard('handleAPICall', async () => {
      if (methodName === 'apply') {
        // apply(tx, op, ack)
        const methodRef = this.module.namespace.getSync('apply', {reference: true})
        if (methodRef?.typeof === 'function') {
          const {actions, tx} = createApplyTransactor()
          await methodRef.apply(null, [tx, params[0], params[1]], {
            arguments: {copy: true},
            result: {promise: true, copy: true}
          })
          return {actions}
        } else {
          throw new MethodNotFound(`Method not found: ${methodName}`)
        }
      } else {
        // func(params, emit)
        const methodRef = _isolateGetFunction(this.module.namespace, methodName.split('.'))
        if (methodRef?.typeof === 'function') {
          const {ops, emit} = createEmitFn()
          const result = await methodRef.apply(null, [params?.[0], emit], {
            arguments: {copy: true},
            result: {promise: true, copy: true}
          })
          return {result, ops}
        } else {
          throw new MethodNotFound(`Method not found: ${methodName}`)
        }
      }
    })
  }

  // private methods
  // =

  _onProcessExit (code) {
    this.exitCode = code
    this.close()
  }

  _wrapGlobals (globalsNode, prefix = '') {
    for (const name in globalsNode) {
      const path = `${prefix}${name}`
      const value = globalsNode[name]
      if (value && typeof value === 'object') {
        globalsNode[name] = this._wrapGlobals(value, `${path}.`)
      } else if (typeof value === 'function') {
        globalsNode[name] = (...args) => {
          this._assertGlobalAllowed(path)
          return this._restrictedGuard('global', () => value(...args))
        }
      }
    }
    return globalsNode
  }

  async _attachGlobals (context, globalsNode, prefix = '') {
    for (const name in globalsNode) {
      if (name === '__internal__') {
        continue // skip, these get called elsewhere
      }
      const value = globalsNode[name]
      if (value && typeof value === 'object') {
        await context.evalClosure(`global.${prefix}${name} = {}`)
        await this._attachGlobals(context, value, `${prefix}${name}.`)
      } else if (typeof value === 'function') {
        await addAsyncGlobal(context, `${prefix}${name}`, value)
      }
    }
  }

  async _configureEnvironment () {
    const context = this.context

    // remove unsafe APIs
    await context.global.delete('eval')
    await context.global.delete('Atomics')
    await context.global.delete('WebAssembly')
    await context.global.delete('Function')
    await context.global.delete('AsyncFunction')

    // attach globals passed to us by the host environment
    if (this._globals) await this._attachGlobals(context, this._globals)
    if (!this._globals?.console) {
      // fallback logging
      await context.evalClosure(`global.console.log = function(...args) {
          $0.applyIgnored(undefined, args, { arguments: { copy: true } });
      }`, [(...args) => console.log('[CONTRACT]', ...args)], { arguments: { reference: true } })
    }

    // attach "fixed" globals
    if (this._globals.__internal__?.contract) {
      await addAsyncGlobal(context, '__internal__contract__indexList', this._globals.__internal__.contract.indexList)
      await addAsyncGlobal(context, '__internal__contract__indexGet', this._globals.__internal__.contract.indexGet)
      await addConstGlobal(context, '__internal__contract__indexPubkey', `"${this._indexPubkey}"`)
      await addSyncGlobal(context, '__internal__contract__oplogListPubkeys', this._listOplogPubkeys)
      await addAsyncGlobal(context, '__internal__contract__oplogGetLength', this._globals.__internal__.contract.oplogGetLength)
      await addAsyncGlobal(context, '__internal__contract__oplogGet', this._globals.__internal__.contract.oplogGet)
      if (typeof this._oplogPubkey === 'string') {
        await addConstGlobal(context, '__internal__contract__oplogPubkey', `"${this._oplogPubkey}"`)
      }
    }
    await addSyncGlobal(context, '__internal__genUUID', uuid.v4)
    await addSyncGlobal(context, '__internal__assert', assert)
    await addSyncGlobal(context, '__internal__assert__deepEqual', assert.deepEqual)
    await addSyncGlobal(context, '__internal__assert__doesNotMatch', assert.doesNotMatch)
    await addSyncGlobal(context, '__internal__assert__equal', assert.equal)
    await addSyncGlobal(context, '__internal__assert__fail', assert.fail)
    await addSyncGlobal(context, '__internal__assert__match', assert.match)
    await addSyncGlobal(context, '__internal__assert__notDeepEqual', assert.notDeepEqual)
    await addSyncGlobal(context, '__internal__assert__notEqual', assert.notEqual)
  }

  _listOplogPubkeys () {
    // TODO
    return []
  }

  _assertGlobalAllowed (path) {
    if (!this.restricted) return
    if (!DISALLOWED_RESTRICTED_METHODS.includes(path)) return
    throw new Error('Method not allowed during restricted execution')
  }

  // when restricted=true, ensures the passed function is called once at a time
  async _restrictedGuard (lockName, fn) {
    if (this.restricted) {
      const release = await lock(lockName)
      try { return await fn() }
      finally { release() }
    } else {
      return fn()
    }
  }
}

function _isolateGetFunction (ref, path) {
  const key = path.shift()
  const subRef = ref.getSync(key, {reference: true})
  if (path.length) {
    if (subRef?.typeof === 'object') {
      return _isolateGetFunction(subRef, path)
    }
    return undefined
  }
  if (subRef?.typeof === 'function') {
    return subRef
  }
  return undefined
}