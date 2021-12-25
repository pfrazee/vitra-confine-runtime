const vm = require('../vm-util')
exports.createEmitFn = function createEmitFn () {
  const ops = []
  return {
    ops,
    emit: vm.cbSync((value) => {
      ops.push(value)
    })
  }
}