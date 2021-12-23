const ivm = require('@andrewosh/isolated-vm')

exports.createContractIndex = (pubkey, handlers) => {
  return {
    pubkey,
    list: new ivm.Callback((...args) => handlers.list(pubkey, ...args)),
    get: new ivm.Callback((...args) => handlers.get(pubkey, ...args)),
    listOplogs: new ivm.Callback((...args) => handlers.listOplogs(pubkey, ...args))
  }
}
