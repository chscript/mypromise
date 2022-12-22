class myPromise {
    constructor(func) {
        this.state = 'pending'
        this.value = undefined
        this.reason = undefined
        this.resolveCallbacks = []
        this.rejectCallbacks = []
        try {
            func(this.resolve, this.reject)
        } catch (e) {
            this.reject(e)
        }
    }
    // 2.1. Promise 状态
    resolve = (value) => {
        if (this.state === 'pending') {
            this.state = 'fulfilled'
            this.value = value
            while (this.resolveCallbacks.length > 0) {
                this.resolveCallbacks.shift().call(undefined)
            }
        }
    }
    reject = (reason) => {
        if (this.state === 'pending') {
            this.state = 'rejected'
            this.reason = reason
            while (this.rejectCallbacks.length > 0) {
                this.rejectCallbacks.shift().call(undefined)
            }
        }
    }
    // 2.2. then 方法
    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
        const p2 = new myPromise((resolve, reject) => {
            if (this.state === 'rejected') {
                queueMicrotask(() => {
                    try {
                        const x = onRejected(this.reason)
                        resolvePromise(p2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                })
            } else if (this.state === 'fulfilled') {
                queueMicrotask(() => {
                    try {
                        const x = onFulfilled(this.value)
                        resolvePromise(p2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                })
            } else if (this.state === 'pending') {
                this.resolveCallbacks.push(() => {
                    queueMicrotask(() => {
                        try {
                            const x = onFulfilled(this.value)
                            resolvePromise(p2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    })
                })
                this.rejectCallbacks.push(() => {
                    queueMicrotask(() => {
                        try {
                            const x = onRejected(this.reason)
                            resolvePromise(p2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    })
                })
            }
        })
        return p2
    }
    catch(onRejected) {
        return this.then(undefined, onRejected)
    }
    finally(callback) {
        return this.then(
            value => {
                return myPromise.resolve(callback()).then(() => value)
            },
            reason => {
                return myPromise.resolve(callback()).then(() => { throw reason })
            }
        )
    }
    // 静态方法
    static resolve(value) {
        if (value instanceof myPromise) {
            return value  // 传入的参数为Promise实例对象，直接返回
        } else {
            return new myPromise((resolve, reject) => {
                resolve(value)
            })
        }
    }
    static reject(reason) {
        return new myPromise((resolve, reject) => {
            reject(reason)
        })
    }
    static all(promises) {
        return new myPromise((resolve, reject) => {
            let countPromise = 0 // 记录传入参数是否为Promise的次数
            let countResolve = 0 // 记录数组中每个Promise被解决次数
            let result = [] // 存储每个Promise的解决或拒绝的值
            if (promises.length === 0) { // 传入的参数是一个空的可迭代对象
                resolve(promises)
            }
            promises.forEach((element, index) => {
                if (element instanceof myPromise === false) { // 传入的参数不包含任何 promise
                    ++countPromise
                    if (countPromise === promises.length) {
                        queueMicrotask(() => {
                            resolve(promises)
                        })
                    }
                } else {
                    element.then(
                        value => {
                            ++countResolve
                            result[index] = value
                            if (countResolve === promises.length) {
                                resolve(result)
                            }
                        },
                        reason => {
                            reject(reason)
                        }
                    )
                }
            })
        })
    }
    static race(promises) {
        return new myPromise((resolve, reject) => {
            if (promises.length !== 0) {
                promises.forEach(element => {
                    if (element instanceof myPromise === true)
                        element.then(
                            value => {
                                resolve(value)
                            },
                            reason => {
                                reject(reason)
                            }
                        )
                })
            }
        })
    }
}
// 2.3 Promise解决程序
function resolvePromise(p2, x, resolve, reject) {
    if (x === p2) {
        // 2.3.1 如果promise和x引用同一个对象
        reject(new TypeError())
    } else if ((x !== null && typeof x === 'object') || typeof x === 'function') {
        // 2.3.2 如果x是一个promise
        // 2.3.3 如果x是一个对象或函数
        let called
        try {
            let then = x.then
            if (typeof then === 'function') {
                then.call(x,
                    (y) => {
                        if (called) { return }
                        called = true
                        resolvePromise(p2, y, resolve, reject)
                    },
                    (r) => {
                        if (called) { return }
                        called = true
                        reject(r)
                    }
                )
            } else {
                resolve(x)
            }
        } catch (e) {
            if (called) { return }
            called = true
            reject(e)
        }
    } else {
        resolve(x)
    }
}

myPromise.deferred = function () {
    let result = {}
    result.promise = new myPromise((resolve, reject) => {
        result.resolve = resolve
        result.reject = reject
    })
    return result
}
module.exports = myPromise