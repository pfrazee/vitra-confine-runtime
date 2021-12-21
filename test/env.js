const ava = require('ava')
const { makeRuntime } = require('./util/util.js')
const uuid = require('uuid')

const TEST_PUBKEY = 'f'.repeat(64)
const TEST_PUBKEY2 = 'e'.repeat(64)

ava('genUUID()', async t => {
  const logs = []
  const runtime = makeRuntime('gen-uuid.js', {
    ito: {
      indexPubkey: TEST_PUBKEY,
    },
    globals: {
      console: {
        log: (...args) => logs.push(args)
      }
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.close()
  t.is(logs.length, 3)
  for (let i = 0; i < 3; i++) {
    t.truthy(uuid.validate(logs[i][0]))
    for (let j = 0; j < 3; j++) {
      if (i !== j) {
        t.not(logs[i][0], logs[j][0])
      }
    }
  }
})

ava('assert', async t => {
  const runtime = makeRuntime('assert.js', {
    ito: {
      indexPubkey: TEST_PUBKEY,
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.close()
  t.pass()
})

ava('ContractIndex', async t => {
  const calls = []
  const runtime = makeRuntime('contract-index.js', {
    ito: {
      indexPubkey: TEST_PUBKEY,
    },
    globals: {
      __contractIndexAPI: {
        list: (...args) => { calls.push(['list', args]); return true },
        get: (...args) => { calls.push(['get', args]); return true },
        listOplogs: (...args) => { calls.push(['listOplogs', args]); return true },
      }
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.handleAPICall('main')
  await runtime.close()
  t.is(calls.length, 4)
  t.is(calls[0][0], 'list')
  t.is(calls[1][0], 'list')
  t.is(calls[2][0], 'get')
  t.is(calls[3][0], 'listOplogs')
  for (let i = 0; i < 4; i++) {
    t.is(calls[i][1][0], TEST_PUBKEY)
  }
})

ava('ContractOplog', async t => {
  const calls = []
  const runtime = makeRuntime('contract-oplog.js', {
    ito: {
      indexPubkey: TEST_PUBKEY,
      oplogPubkey: TEST_PUBKEY2
    },
    globals: {
      __contractOplogAPI: {
        getLength: (...args) => { calls.push(['getLength', args]); return true },
        get: (...args) => { calls.push(['get', args]); return true },
        append: (...args) => { calls.push(['append', args]); return true },
      }
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.handleAPICall('main')
  await runtime.close()
  t.is(calls.length, 3)
  t.is(calls[0][0], 'getLength')
  t.is(calls[1][0], 'get')
  t.is(calls[2][0], 'append')
  for (let i = 0; i < 3; i++) {
    t.is(calls[i][1][0], TEST_PUBKEY2)
  }
})

ava('Removed any unsafe APIs', async t => {
  const runtime = makeRuntime('unsafe-apis.js', {
    ito: {
      indexPubkey: TEST_PUBKEY,
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.close()
  t.pass()
})