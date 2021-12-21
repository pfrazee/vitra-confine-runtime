import { add } from './funcs/add.js'
import mult from './funcs/mult.js'

start()

async function start () {
  console.log('add result:', add(1, 2))
  console.log('mult result:', mult(1, 2))
}
