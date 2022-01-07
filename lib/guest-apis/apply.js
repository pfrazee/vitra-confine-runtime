const vm = require('../vm-util')
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
  let inc = 0
  return {
    actions,
    tx: {
      get: vm.cbSync((key) =>{
        key = normalizeKey(key)
        return actions[key]
      }),

      put: vm.cbSync((key, value) => {
        key = normalizeKey(key)
        assertUnprotectedKey(key)
        actions[key] = {type: 'put', value}
      }),

      delete: vm.cbSync((key) => {
        key = normalizeKey(key)
        assertUnprotectedKey(key)
        actions[key] = {type: 'del'}
      }),

      addOplog: vm.cbSync((opts) => {
        assert.match(opts?.pubkey, /^[0-9a-f]{64}$/, 'Must pass a valid {pubkey} string to addOplog')
        actions[`/.sys/_action${inc++}`] = {type: 'addOplog', value: {pubkey: opts.pubkey}}
      }),

      removeOplog: vm.cbSync((opts) => {
        assert.match(opts?.pubkey, /^[0-9a-f]{64}$/, 'Must pass a valid {pubkey} string to removeOplog')
        actions[`/.sys/_action${inc++}`] = {type: 'removeOplog', value: {pubkey: opts.pubkey}}
      }),

      setContractSource: vm.cbSync((opts) => {
        assert(typeof opts?.code === 'string', 'Must pass a valid {code} string to setContractSource')
        actions[`/.sys/_action${inc++}`] = {type: 'setContractSource', value: {code: opts.code}}
      }),
    }
  }
}