const ivm = require('@andrewosh/isolated-vm')
const assert = require('assert').strict

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

exports.createApplyTransactor = function createApplyTransactor () {
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