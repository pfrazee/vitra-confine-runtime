export async function main () {
  await index.list('/')
  await index.list('/', {reverse: true})
  await index.get('/foo')
  await index.listOplogs()
}