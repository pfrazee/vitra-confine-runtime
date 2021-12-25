const ava = require('ava')
const { makeRuntime } = require('./util/util.js')

const TEST_PUBKEY = 'f'.repeat(64)
const TEST_PUBKEY2 = 'e'.repeat(64)

ava('Restricted mode', async t => {
  let logs = []
  const runtime = makeRuntime('restricted-mode.js', {
    env: {
      indexPubkey: TEST_PUBKEY,
      oplogPubkey: TEST_PUBKEY2
    },
    globals: {
      sleep: (ms) => new Promise(r => setTimeout(r, ms)),
      console: {
        log: (...args) => logs.push(args)
      }
    }
  })
  await runtime.init()
  await runtime.run()

  logs = []
  await Promise.all([
    runtime.handleAPICall('slowFunc'),
    runtime.handleAPICall('slowFunc'),
    runtime.handleAPICall('slowFunc'),
  ])
  t.deepEqual(logs, [['start'],['start'],['start'],['end'],['end'],['end']])

  logs = []
  runtime.configure({restricted: true})
  await Promise.all([
    runtime.handleAPICall('slowFunc'),
    runtime.handleAPICall('slowFunc'),
    runtime.handleAPICall('slowFunc'),
  ])
  t.deepEqual(logs, [['start'],['end'],['start'],['end'],['start'],['end']])

  logs = []
  runtime.configure({restricted: false})
  await Promise.all([
    runtime.handleAPICall('slowFunc'),
    runtime.handleAPICall('slowFunc'),
    runtime.handleAPICall('slowFunc'),
  ])
  t.deepEqual(logs, [['start'],['start'],['start'],['end'],['end'],['end']])

  await runtime.close()
})
