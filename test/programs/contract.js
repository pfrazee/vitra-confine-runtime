import { oplog, index, listOplogs } from 'contract'

export async function main () {
  const res1 = await index.list('/')
  const res2 = await index.list('/', {reverse: true})
  const res3 = await index.get('/foo')
  const res4 = await listOplogs()
  const res5 = await oplog.getLength()
  const res6 = await oplog.get(5)
  return [res1, res2, res3, res4, res5, res6]
}