const vm = require('../vm-util')

exports.addContractOplogGlobal = async (context, handlers) => {
  await vm.addAsyncGlobal(context, '__internal__contractOplog__getLength', handlers.getLength)
  await vm.addAsyncGlobal(context, '__internal__contractOplog__get', handlers.get)
  await vm.addAsyncGlobal(context, '__internal__contractOplog__append', handlers.append)
  await context.eval(`
    global.ContractOplog = class ContractOplog {
      constructor (pubkey) {
        this.pubkey = pubkey
      }

      async getLength (...args) {
        return __internal__contractOplog__getLength(this.pubkey, ...args)
      }

      async get (...args) {
        return __internal__contractOplog__get(this.pubkey, ...args)
      }

      async append (...args) {
        return __internal__contractOplog__append(this.pubkey, ...args)
      } 
    }
  `)
}
