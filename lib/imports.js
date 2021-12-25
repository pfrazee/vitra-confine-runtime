const path = require('path')
const fs = require('fs')

const STDLIB_PATH = path.join(__dirname, 'guest-stdlib')
const STDLIB = {
  assert: fs.readFileSync(path.join(STDLIB_PATH, 'assert.js'), 'utf8'),
  contract: fs.readFileSync(path.join(STDLIB_PATH, 'contract.js'), 'utf8'),
  util: fs.readFileSync(path.join(STDLIB_PATH, 'util.js'), 'utf8')
}

module.exports = class ImportController {
  constructor (vmIsolate, readSourceFile) {
    this.vmIsolate = vmIsolate
    this.readSourceFile = readSourceFile
    this.modulePromiseCache = new Map()
  }

  resolve (specifier, referrer) {
    let promise = this.modulePromiseCache.get(specifier)
    if (!promise) {
      promise = this._resolveModule(specifier)
      this.modulePromiseCache.set(specifier, promise)
    }
    return promise
  }

  async _resolveModule (specifier) {
    let sourceCode
    if (STDLIB[specifier]) {
      sourceCode = STDLIB[specifier]
    } else if (this.readSourceFile) {
      specifier = path.normalize(specifier)
      sourceCode = await this.readSourceFile(specifier).catch(e => { console.log(e); return '' })
    } else {
      sourceCode = ''
    }
    return this.vmIsolate.compileModule(sourceCode)
  }
}