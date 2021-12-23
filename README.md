# "In The Open" Confine Runtime

[Confine](https://github.com/confine-sandbox/confine) runtime for "In The Open." Runs javascript in an isolate with the following properties:

- ES Modules only.
- Special handling of `apply()` export.
- Builtin standard modules:
  - `assert`
  - `util`
- Builtin globals:
  - `index`
  - `oplog`
- Removed APIs:
  - `eval`
  - `Atomics`
  - `WebAssembly`
  - `Function`
  - `AsyncFunction`

Install:

```
npm i ito-confine-runtime
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
      contractIndex: {
        list: Function
        get: Function
        listOplogs: Function
      },
      contractOplog: {
        getLength: Function
        get: Function
        append: Function
      }
    }
  }
}
```

The `__internals__` values above must be provided by the host environment.

## Restricted mode

In restricted mode, mutations are disabled and all async functions are resolved prior to allowing the next to execute.

## Globals

### `index`

```javascript
await index.list(prefix, opts)
await index.get(key)
await index.listOplogs()
```

### `oplog`

```javascript
await oplog.getLength()
await oplog.get(seq)
await oplog.append(value)
```

## Standard Modules

### `assert`

```javascript
import ok, * as assert from 'assert'

ok(value, message)
deepEqual(v1, v2, message)
doesNotMatch(str, regex, message)
equal(v1, v2, message)
fail(message)
match(str, regex, message)
notDeepEqual(v1, v2, message)
notEqual(v1, v2, message)
```

### `util`

```javascript
import { genUUID } from 'util'

genUUID() // => string
```