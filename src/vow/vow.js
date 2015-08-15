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

        return {
            resolve: resolve,
            reject: reject,
            then: then,
            catch: function (failCallback) {
                returnPromise = PromiseObj();
                handleReject(failCallback);

                return {
                    then: returnPromise.then,
                    catch: returnPromise.catch,
                    done: returnPromise.done
                };
            },
            done: done
        };

        function resolve(val) {
            value = val;
            state = RESOLVED;

            if (onResolved) {
                handleResolve(onResolved);
            } else {
                handleDone(onFullfilled);
            }
        }

        function reject(err) {
            value = err;
            state = REJECTED;

            if (onRejected) {
                handleReject(onRejected);
            } else {
                handleDone(onFullfilled);
            }
        }

        function then(successCallback) {
            returnPromise = PromiseObj();
            handleResolve(successCallback);

            return {
                then: returnPromise.then,
                catch: returnPromise.catch,
                done: returnPromise.done
            };
        }

        function done(finallyCallback) {
            handleDone(finallyCallback);
        }

        function handleDone(fn) {
            if (state === PENDING) {
                onFullfilled = fn;
            }

            if (state === RESOLVED && typeof fn === 'function') {
                return fn.call(this, value);
            }

            if (state === REJECTED) {
                throw value;
            }
        }

        function handleResolve(fn) {
            if (state === PENDING) {
                onResolved = fn;
            }

            if (state === RESOLVED) {
                if (value && typeof value.then === 'function') {
                    value.then(resolve);
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
        }
    }
};
