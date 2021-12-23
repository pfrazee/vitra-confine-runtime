/*
await-lock
The MIT License (MIT)
Copyright (c) 2015-present James Ide
*/

class AwaitLock {
  constructor() {
    this._acquired = false;
    this._waitingResolvers = [];
  }
  
  get acquired() {
    return this._acquired;
  }
  
  acquireAsync() {
    if (!this._acquired) {
      this._acquired = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._waitingResolvers.push(resolve);
    });
  }
  
  tryAcquire() {
    if (!this._acquired) {
      this._acquired = true;
      return true;
    }
    return false;
  }
  
  release() {
    if (!this._acquired) {
      throw new Error(`Cannot release an unacquired lock`);
    }
    if (this._waitingResolvers.length > 0) {
      const resolve = this._waitingResolvers.shift();
      if (resolve) {
        resolve(undefined);
      }
    }
    else {
      this._acquired = false;
    }
  }
}

const locks = {}
module.exports = async function (key) {
  if (!(key in locks)) locks[key] = new AwaitLock()
  
  var lock = locks[key]
  await lock.acquireAsync()
  return lock.release.bind(lock)
}