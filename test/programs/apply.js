export async function apply (tx, op, ack) {
  switch (op.op) {
    case 'PUT':
      tx.put(op.key, op.value)
      break
    case 'DEL':
      tx.delete(op.key)
      break
    case 'ADD_OPLOG':
      tx.addOplog({pubkey: op.value})
      break
    case 'REMOVE_OPLOG':
      tx.removeOplog({pubkey: op.value})
      break
    case 'SET_SRC':
      tx.setContractSource({code: op.value})
      break
  }
}