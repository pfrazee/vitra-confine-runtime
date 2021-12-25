const ava = require('ava')
const { makeRuntime } = require('./util/util.js')
const uuid = require('uuid')

const TEST_PUBKEY = 'f'.repeat(64)
const TEST_PUBKEY2 = 'e'.repeat(64)

ava('genUUID()', async t => {
  const logs = []
  const runtime = makeRuntime('gen-uuid.js', {
    env: {
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
    env: {
      indexPubkey: TEST_PUBKEY,
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.close()
  t.pass()
})

ava('contract', async t => {
  const calls = []
  const runtime = makeRuntime('contract.js', {
    env: {
      indexPubkey: TEST_PUBKEY,
      oplogPubkey: TEST_PUBKEY2
    },
    globals: {
      __internal__: {
        contract: {
          indexList: async (...args) => { calls.push(['indexList', args]); return 'indexList' },
          indexGet: async (...args) => { calls.push(['indexGet', args]); return 'indexGet' },
          oplogGetLength: (...args) => { calls.push(['oplogGetLength', args]); return 'oplogGetLength' },
          oplogGet: (...args) => { calls.push(['oplogGet', args]); return 'oplogGet' }
        }
      }
    }
  })
  await runtime.init()
  await runtime.run()
  const res = await runtime.handleAPICall('main')
  await runtime.close()
  t.deepEqual(res.result, ['indexList', 'indexList', 'indexGet', [], 'oplogGetLength', 'oplogGet'])
  t.is(calls.length, 5)
  t.is(calls[0][0], 'indexList')
  t.is(calls[1][0], 'indexList')
  t.is(calls[2][0], 'indexGet')
  t.is(calls[3][0], 'oplogGetLength')
  t.is(calls[4][0], 'oplogGet')
  for (let i = 0; i < 3; i++) {
    t.is(calls[i][1][0], TEST_PUBKEY)
  }
  for (let i = 3; i < 5; i++) {
    t.is(calls[i][1][0], TEST_PUBKEY2)
  }
})

ava('Removed any unsafe APIs', async t => {
  const runtime = makeRuntime('unsafe-apis.js', {
    env: {
      indexPubkey: TEST_PUBKEY,
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.close()
  t.pass()
})