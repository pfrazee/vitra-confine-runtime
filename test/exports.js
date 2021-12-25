const ava = require('ava')
const { makeRuntime } = require('./util/util.js')

const TEST_PUBKEY = 'f'.repeat(64)

ava('exports', async t => {
  const runtime = makeRuntime('exports.js', {
    env: {
      indexPubkey: TEST_PUBKEY,
    }
  })
  await runtime.init()
  await runtime.run()
  t.deepEqual(await runtime.handleAPICall('main', [{foo: 'bar'}]), {
    result: 1,
    ops: [{op: 'foo', params: {foo: 'bar'}}]
  })
  t.deepEqual(await runtime.handleAPICall('main', [{foo: 'bar'}]), {
    result: 2,
    ops: [{op: 'foo', params: {foo: 'bar'}}, {op: 'bar'}]
  })
  t.deepEqual(await runtime.handleAPICall('main', [{foo: 'bar'}]), {
    result: 3,
    ops: [{op: 'foo', params: {foo: 'bar'}}]
  })
  await runtime.close()
})
