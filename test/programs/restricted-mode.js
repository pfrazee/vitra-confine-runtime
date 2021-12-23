export async function slowFunc () {
  console.log('start')
  await sleep(500)
  console.log('end')
}

export async function doAppend () {
  return await oplog.append({op: 'SOME_OP'})
}