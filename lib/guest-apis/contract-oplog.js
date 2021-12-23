const ivm = require('@andrewosh/isolated-vm')

exports.createContractOplog = (pubkey, handlers) => {
  return {
    pubkey,
    getLength: new ivm.Callback((...args) => handlers.getLength(pubkey, ...args)),
    get: new ivm.Callback((...args) => handlers.get(pubkey, ...args)),
    append: new ivm.Callback((...args) => handlers.append(pubkey, ...args))
  }
}
