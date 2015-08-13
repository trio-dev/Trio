var LinkedList = function() {
    this.head = null;
    this.tail = null;
};

LinkedList.prototype.addToTail = function(fn, type) {
    var tick = {
        type: type,
        func: fn,
        next: null
    };

    if (!this.head) {
        this.head = tick;
        this.head.next = this.tail;
    }

    if (this.tail) {
        this.tail.next = tick;
    }
    
    this.tail = tick;
};

LinkedList.prototype.removeHead = function() {
    var previousHead;

    if (this.head) {
        previousHead = this.head;
    }

    if (this.head.next) {
        this.head = this.head.next;
    } else {
        this.tail = null;
        this.head = null;
    }

    return previousHead;
};

var PENDING  = {},
    RESOLVED = {},
    REJECTED = {}; 

var Vow = function() {
    var vow = {};

    var status   = PENDING;
    var deferred = new LinkedList();
    var value;

    vow.resolve = function(ret) {
            status = RESOLVED;
            value = ret;

            if (deferred.head) {
                handle();
            }
    };

    vow.reject = function(err) {
            status = REJECTED;
            value = err;

            if (deferred.head) {
                handle();
            }
    };


    vow.promise = (function() {
        var promise = {};

        promise.then = function(func) {
            console.log('add', this);
            deferred.addToTail(func, 'then');
            return promise;
        };

        promise.catch = function(func) {
            deferred.addToTail(func, 'catch');
            return promise;
        };

        promise.done = function(func) {
            deferred.addToTail(func, 'done');
        };

        return promise;

    })();

    return vow;
    
    function handle() {
        if (!deferred.head) {
            return;
        }
        var head = deferred.removeHead();
        var fn = head.func;
        var type = head.type;

        if (type === 'done') {
            if (status === REJECTED) {
                throw value;
            } else if (status === RESOLVED) {
                fn.call(this, value);
            }
            return;
        }

        if (status === RESOLVED) {
            if (type === 'then') {
                if (value && typeof value.then === 'function') {
                    value.then(vow.resolve);
                    return;
                }

                try {
                    value = fn.call(this, value);
                } catch (err) {
                    status = REJECTED;
                    value  = err;
                    handle();
                    return;
                }
            }
        }

        if (status === REJECTED) {
            if (type === 'catch') {
                try {
                    value = fn.call(this, value);
                } catch (err) {
                    status = REJECTED;
                    value  = err;
                    handle();
                    return;
                }
            } else if (type === 'then') {
                return;
            }
        }
            
        status = RESOLVED;
        handle();

    }
};
