const {readFileSync} = require('fs')
const {join} = require('path')
const VitraConfineRuntime = require('../../index.js')

const get = path => readFileSync(path)

exports.makeRuntime = (programPath, opts = {}) => {
  const path = join(__dirname, '..', 'programs', programPath)
  opts = Object.assign(opts, {
    source: get(path),
    path,
    env: opts.env || 'vanilla',
    module: opts.module || 'cjs'
  })
  return new VitraConfineRuntime(opts)
}