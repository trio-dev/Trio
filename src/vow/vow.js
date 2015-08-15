/*jshint es5: true */
var PENDING   = {},
    RESOLVED  = {},
    REJECTED  = {},
    FULFILLED = {};

var Vow = function() {
    var vow = {};
    var _promise = PromiseObj();

    vow.resolve = _promise.resolve;
    vow.reject  = _promise.reject;
    vow.promise = {
        then: _promise.then,
        catch: _promise.catch,
        done: _promise.done
    };

    return vow;

    function PromiseObj() {
        var state = PENDING;
        var value, onResolved, onRejected, onFullfilled, returnPromise;

        var ret = {

            resolve: function (val) {
                value = val;
                state = RESOLVED;

                if (onResolved) {
                    handleResolve(onResolved);
                } else {
                    handleDone(onFullfilled);
                }
            },

            reject: function (err) {
                value = err;
                state = REJECTED;

                if (onRejected) {
                    handleReject(onRejected);
                } else {
                    handleDone(onFullfilled);
                }
            },

            then: function (successCallback) {
                returnPromise = PromiseObj();
                handleResolve(successCallback);

                return {
                    then: returnPromise.then,
                    catch: ret.catch,
                    done: returnPromise.done
                };
            },

            catch: function (failCallback) {
                returnPromise = PromiseObj();
                handleReject(failCallback);

                return {
                    then: returnPromise.then,
                    catch: ret.catch,
                    done: returnPromise.done
                };
            },

            done: function (finallyCallback) {
                handleDone(finallyCallback);
            }
        };

        return ret;

        function handleDone(fn) {
            if (state === PENDING) {
                onFullfilled = fn;
                return;
            }

            if (state === RESOLVED && typeof fn === 'function') {
                state = FULFILLED;
                return fn.call(this, value);
            }

            if (state === REJECTED) {
                state = FULFILLED;
                throw value;
            }
        }

        function handleResolve(fn) {
            if (state === PENDING) {
                onResolved = fn;
            }

            if (state === RESOLVED) {
                if (value && typeof value.then === 'function') {
                    value.then(ret.resolve);
                    return;
                }
                try {
                    value = fn.call(this, value);
                    if (returnPromise) {
                        returnPromise.resolve(value);
                    }
                } catch (err) {
                    value = err;
                    if (returnPromise) {
                        returnPromise.reject(value);
                    }
                }
            }
        }

        function handleReject(fn) {
            if (state === PENDING) {
                onRejected = fn;
            }

            if (state === REJECTED) {
                try {
                    value = fn.call(this, value);
                    if (returnPromise) {
                        returnPromise.resolve(value);
                    }
                } catch (err) {
                    value = err;
                    if (returnPromise) {
                        returnPromise.reject(value);
                    }
                }
            }

            if (state === RESOLVED) {
                if (returnPromise) {
                    returnPromise.resolve(value);
                }
            }
        }
    }
};
