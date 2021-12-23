const EventEmitter = require('events')
const fs = require('fs')
const { APIDescription, APIObject, APIMethod, MethodNotFound } = require('abstract-confine-runtime')
const ivm = require('@andrewosh/isolated-vm')
const ImportController = require('./imports')
const uuid = require('uuid')
const assert = require('assert').strict
const { createApplyTransactor } = require('./guest-apis/apply')
const { createContractIndex } = require('./guest-apis/contract-index')
const { createContractOplog } = require('./guest-apis/contract-oplog')

exports.ItoEsmIsolate = class ItoEsmIsolate extends EventEmitter {
  constructor (source, opts = {}) {
    super()
    this.source = source
    this.path = opts.path
    this.fs = opts.fs || fs.promises
    this.isolate = new ivm.Isolate(opts)
    this.context = undefined
    this.module = null
    this.exitCode = undefined

    this.opened = false
    this.closed = false

    this._importController = null
    this._internalGlobals = opts.globals?.__internal__
    this._globals = deepMapOpt(opts.globals)
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
    this._importController = new ImportController(this.isolate, this._internalGlobals?.sys?.readSourceFile)
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

  describeAPI () {
    // TODO: we need to figure out a way to enumerate the keys in `this.module.namespace`
    return new APIDescription([])
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
      const method = _isolateGetFunction(this.module.namespace, methodName.split('.'))
      if (typeof method === 'function') {
        return await method(...(params || []))
      } else {
        throw new MethodNotFound(`Method not found: ${methodName}`)
      }
    }
  }

  // private methods
  // =

  _onProcessExit (code) {
    this.exitCode = code
    this.close()
  }

  _getInternalHandlers (name) {
    return this._internalGlobals?.[name] || {}
  }

  async _attachGlobals (context, globalsNode, prefix = '') {
    for (const [name, value] of globalsNode) {
      if (name.startsWith('__internal__.')) {
        continue // skip, these get called elsewhere
      }
      if (value instanceof Map) {
        await context.evalClosure(`global.${prefix}${name} = {}`)
        await this._attachGlobals(context, value, `${prefix}${name}.`)
      } else if (typeof value === 'function') {
        const func = value
        await context.evalClosure(`global.${prefix}${name} = function (...args) {
          return $0.apply(undefined, args, { result: { promise: true, copy: true }, arguments: { copy: true } })
        }`, [new ivm.Reference(func)], { result: { copy: true }, arguments: { copy: true } })
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
    if (!this._globals?.has('console')) {
      // fallback logging
      await context.evalClosure(`global.console.log = function(...args) {
          $0.applyIgnored(undefined, args, { arguments: { copy: true } });
      }`, [(...args) => console.log('[CONTRACT]', ...args)], { arguments: { reference: true } })
    }

    // attach "fixed" globals
    const global = async (name, func) => {
      await context.evalClosure(`global.${name} = function (...args) {
        return $0.applySync(undefined, args, { result: { promise: false, copy: true }, arguments: { copy: true } })
      }`, [new ivm.Reference(func)], { result: { copy: true }, arguments: { copy: true } })
    }
    await context.evalClosure(
      `global.index = $0`,
      [createContractIndex(this._indexPubkey, this._getInternalHandlers('contractIndex'))],
      {result: {copy: true}, arguments: {copy: true}}
    )
    if (typeof this._oplogPubkey === 'string') {
      await context.evalClosure(
        `global.oplog = $0`,
        [createContractOplog(this._oplogPubkey, this._getInternalHandlers('contractOplog'))],
        {result: {copy: true}, arguments: {copy: true}}
      )
    }
    await global('__internal__genUUID', uuid.v4)
    await global('__internal__assert', assert)
    await global('__internal__assert__deepEqual', assert.deepEqual)
    await global('__internal__assert__doesNotMatch', assert.doesNotMatch)
    await global('__internal__assert__equal', assert.equal)
    await global('__internal__assert__fail', assert.fail)
    await global('__internal__assert__match', assert.match)
    await global('__internal__assert__notDeepEqual', assert.notDeepEqual)
    await global('__internal__assert__notEqual', assert.notEqual)
  }
}

function mapOpt (opt) {
  if (!opt) return null
  if (opt instanceof Map) return opt
  return new Map(Object.entries(opt))
}

function deepMapOpt (opt) {
  const map = mapOpt(opt)
  if (!map) return null
  return new Map(Array.from(map).map(([k, v]) => {
    if (v && typeof v === 'object') v = deepMapOpt(v)
    return [k, v]
  }))
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
    return (...args) => subRef.apply(null, args, {
      arguments: { copy: true },
      result: { promise: true, copy: true }
    })
  }
  return undefined
}