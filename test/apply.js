const ava = require('ava')
const { makeRuntime } = require('./util/util.js')

const TEST_PUBKEY = 'f'.repeat(64)

ava('apply', async t => {
  const runtime = makeRuntime('apply.js', {
    env: {
      indexPubkey: TEST_PUBKEY,
    }
  })
  await runtime.init()
  await runtime.run()
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'PUT', key: 'foo', value: {some: 'thing'}}, {}]), {
    actions: {
      '/foo': {type: 'put', value: {some: 'thing'}}
    }
  })
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'PUT', key: '/foo2', value: {some: 'thing'}}, {}]), {
    actions: {
      '/foo2': {type: 'put', value: {some: 'thing'}}
    }
  })
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'PUT', key: '/foo3//////', value: {some: 'thing'}}, {}]), {
    actions: {
      '/foo3': {type: 'put', value: {some: 'thing'}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'PUT'}, {}]))
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'PUT', key: '/'}, {}]))
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'PUT', key: '//////'}, {}]))
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'DEL', key: 'foo'}, {}]), {
    actions: {
      '/foo': {type: 'delete'}
    }
  })
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'ADD_OPLOG', value: TEST_PUBKEY}, {}]), {
    actions: {
      [`/.sys/_action0`]: {type: 'addOplog', value: {pubkey: TEST_PUBKEY}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'ADD_OPLOG', value: 'asdf'}, {}]))
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'REMOVE_OPLOG', value: TEST_PUBKEY}, {}]), {
    actions: {
      [`/.sys/_action0`]: {type: 'removeOplog', value: {pubkey: TEST_PUBKEY}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'REMOVE_OPLOG', value: 'asdf'}, {}]))
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'SET_SRC', value: 'cool()'}, {}]), {
    actions: {
      '/.sys/_action0': {type: 'setContractSource', value: {code: 'cool()'}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'SET_SRC'}, {}]))
  await runtime.close()
})

ava('apply2', async t => {
  const runtime = makeRuntime('apply2.js', {
    env: {
      indexPubkey: TEST_PUBKEY,
    }
  })
  await runtime.init()
  await runtime.run()
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'PUT', key: 'foo', value: {some: 'thing'}}, {}]), {
    actions: {
      '/foo': {type: 'put', value: {some: 'thing'}}
    }
  })
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'PUT', key: '/foo2', value: {some: 'thing'}}, {}]), {
    actions: {
      '/foo2': {type: 'put', value: {some: 'thing'}}
    }
  })
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'PUT', key: '/foo3//////', value: {some: 'thing'}}, {}]), {
    actions: {
      '/foo3': {type: 'put', value: {some: 'thing'}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'PUT'}, {}]))
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'PUT', key: '/'}, {}]))
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'PUT', key: '//////'}, {}]))
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'DEL', key: 'foo'}, {}]), {
    actions: {
      '/foo': {type: 'delete'}
    }
  })
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'ADD_OPLOG', value: TEST_PUBKEY}, {}]), {
    actions: {
      [`/.sys/_action0`]: {type: 'addOplog', value: {pubkey: TEST_PUBKEY}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'ADD_OPLOG', value: 'asdf'}, {}]))
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'REMOVE_OPLOG', value: TEST_PUBKEY}, {}]), {
    actions: {
      [`/.sys/_action0`]: {type: 'removeOplog', value: {pubkey: TEST_PUBKEY}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'REMOVE_OPLOG', value: 'asdf'}, {}]))
  t.deepEqual(await runtime.handleAPICall('apply', [{op: 'SET_SRC', value: 'cool()'}, {}]), {
    actions: {
      '/.sys/_action0': {type: 'setContractSource', value: {code: 'cool()'}}
    }
  })
  await t.throwsAsync(() => runtime.handleAPICall('apply', [{op: 'SET_SRC'}, {}]))
  await runtime.close()
})
