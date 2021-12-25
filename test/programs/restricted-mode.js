export async function slowFunc () {
  console.log('start')
  await sleep(500)
  console.log('end')
}
