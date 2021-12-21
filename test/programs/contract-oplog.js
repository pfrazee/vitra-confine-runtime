export async function main () {
  await oplog.getLength()
  await oplog.get(5)
  await oplog.append({hi: 'there'})
}