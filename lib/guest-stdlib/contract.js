class ContractIndex {
  constructor (pubkey) {
    this.pubkey = pubkey
  }

  list (prefix, opts) {
    return __internal__contract__indexList(this.pubkey, prefix, opts)
  }

  get (key) {
    return __internal__contract__indexGet(this.pubkey, key)
  }
}

class ContractOplog {
  constructor (pubkey) {
    this.pubkey = pubkey
  }

  getLength () {
    return __internal__contract__oplogGetLength(this.pubkey)
  }

  get (seq) {
    return __internal__contract__oplogGet(this.pubkey, seq)
  }
}

const indexPubkey = global.__internal__contract__indexPubkey
const oplogPubkey = global.__internal__contract__oplogPubkey
export const isWriter = typeof oplogPubkey === 'string'
export const index = typeof indexPubkey === 'string' ? new ContractIndex(indexPubkey) : undefined
export const oplog = typeof oplogPubkey === 'string' ? new ContractOplog(oplogPubkey) : undefined
export function listOplogs () {
  const pubkeys = __internal__contract__oplogListPubkeys()
  return pubkeys.map(pubkey => new ContractOplog(pubkey))
}
