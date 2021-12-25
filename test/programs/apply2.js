export const apply = {
  PUT (tx, op) {
    tx.put(op.key, op.value)
  },
  DEL (tx, op) {
    tx.delete(op.key)
  },
  ADD_OPLOG (tx, op) {
    tx.addOplog({pubkey: op.value})
  },
  REMOVE_OPLOG (tx, op) {
    tx.removeOplog({pubkey: op.value})
  },
  SET_SRC (tx, op) {
    tx.setContractSource({code: op.value})
  }
}
