const ava = require('ava')
const { makeRuntime } = require('./util/util.js')
const { join } = require('path')

const TEST_PUBKEY = 'f'.repeat(64)

ava('Basic', async t => {
  const logs = []
  const errors = []
  const runtime = makeRuntime('basic.js', {
    ito: {
      indexPubkey: TEST_PUBKEY,
    },
    globals: {
      console: {
        log: (...args) => logs.push(args),
        error: (...args) => errors.push(args)
      }
    }
  })
  await runtime.init()
  await runtime.run()
  await runtime.close()
  t.is(logs.length, 1)
  t.is(logs[0][0], 'hello, world')
  t.is(errors.length, 1)
  t.is(errors[0][0], 'hello, error')
})

ava('Disable imports', async t => {
  const logs = []
  const runtime = makeRuntime(join('imports', 'index.js'), {
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
  await t.throwsAsync(() => runtime.run())
  await runtime.close()
})
