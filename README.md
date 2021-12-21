# "In The Open" Confine Runtime

[Confine](https://github.com/confine-sandbox/confine) runtime: Extends [jsisolate-confine-runtime](https://github.com/confine-sandbox/jsisolate-confine-runtime) with the following properties:

- ES Modules only.
- Imports disabled.
- Custom globals (`assert`, `genUUID`, `index`, `oplog`).
- Special handling of `apply()` export.

Install:

```
npm i ito-confine-runtime
```
