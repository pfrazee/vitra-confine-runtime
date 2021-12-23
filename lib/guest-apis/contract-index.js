const vm = require('../vm-util')

exports.addContractIndexGlobal = async (context, handlers) => {
  await vm.addAsyncGlobal(context, '__internal__contractIndex__list', handlers.list)
  await vm.addAsyncGlobal(context, '__internal__contractIndex__get', handlers.get)
  await vm.addAsyncGlobal(context, '__internal__contractIndex__listOplogs', handlers.listOplogs)
  await context.eval(`
    global.ContractIndex = class ContractIndex {
      constructor (pubkey) {
        this.pubkey = pubkey
      }

      async list (...args) {
        return __internal__contractIndex__list(this.pubkey, ...args)
      }

      async get (...args) {
        return __internal__contractIndex__get(this.pubkey, ...args)
      }

      async listOplogs (...args) {
        return __internal__contractIndex__listOplogs(this.pubkey, ...args)
      } 
    }
  `)
}
