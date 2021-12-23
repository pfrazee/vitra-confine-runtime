const ivm = require('@andrewosh/isolated-vm')

exports.cbSync = (fn) => new ivm.Callback(fn)
exports.cbAsync = (fn) => new ivm.Callback(fn, {async: true})

exports.addSyncGlobal = async (context, name, fn) => {
  await context.evalClosure(`global.${name} = function (...args) {
    return $0.applySync(undefined, args, {result: {promise: false, copy: true}, arguments: {copy: true}})
  }`, [new ivm.Reference(fn)], {result: {copy: true}, arguments: {copy: true}})
}

exports.addAsyncGlobal = async (context, name, fn) => {
  await context.evalClosure(`global.${name} = function (...args) {
    return $0.apply(undefined, args, {result: {promise: true, copy: true}, arguments: {copy: true}})
  }`, [new ivm.Reference(fn)], {result: {copy: true}, arguments: {copy: true}})
}