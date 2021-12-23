export async function main () {
  const res1 = await index.list('/')
  const res2 = await index.list('/', {reverse: true})
  const res3 = await index.get('/foo')
  const res4 = await index.listOplogs()
  return [res1, res2, res3, res4]
}