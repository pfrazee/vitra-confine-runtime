# Vitra Confine Runtime

[Confine](https://github.com/confine-sandbox/confine) runtime for [Vitra](https://github.com/pfrazee/vitra). Runs javascript in an isolate with the following properties:

- ES Modules only.
- Special handling of `apply()` and other exports.
- Builtin standard modules:
  - `assert`
  - `contract`
  - `util`
- Removed APIs:
  - `eval`
  - `Atomics`
  - `WebAssembly`
  - `Function`
  - `AsyncFunction`

Install:

```
npm i vitra-confine-runtime
```

Options:

```typescript
{
  restricted: boolean, // running in restricted mode?
  env: {
    indexPubkey: string, // 64 char hex string
    oplogPubkey?: string // 64 char hex string
  },
  globals: {
    __internals__: {
      sys: {
        readSourceFile (specifier: string): Promise<string>
      },
      contract: {
        indexList: Function
        indexGet: Function
        oplogGetLength: Function
        oplogGet: Function
      }
    }
  }
}
```

The `__internals__` values above must be provided by the host environment.

## Restricted mode

In restricted mode, mutations are disabled and all async functions are resolved prior to allowing the next to execute.

## Standard Modules

### `assert`

```javascript
import ok, * as assert from 'assert'

ok(value, message)
assert.ok(value, message)
assert.deepEqual(v1, v2, message)
assert.equal(v1, v2, message)
assert.fail(message)
assert.notDeepEqual(v1, v2, message)
assert.notEqual(v1, v2, message)
```

### `contract`

```javascript
import { index, oplog, isWriter, listOplogs } from 'contract'

listOplogs() // => ContractOplog[]
isWriter // boolean
await index.list(prefix, opts)
await index.get(key)
await oplog.getLength()
await oplog.get(seq)
```

### `util`

```javascript
import { genUUID } from 'util'

genUUID() // => string
```