# "In The Open" Confine Runtime

[Confine](https://github.com/confine-sandbox/confine) runtime: Extends [jsisolate-confine-runtime](https://github.com/confine-sandbox/jsisolate-confine-runtime) with the following properties:

- ES Modules only.
- Imports disabled.
- Special handling of `apply()` export.
- Added APIs:
  - `assert`
  - `genUUID`
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
