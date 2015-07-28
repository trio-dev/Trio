var LinkedList = function() {
    this.head = null;
    this.tail = null;
};

LinkedList.prototype.addToTail = function(fn) {
    var tick = {
        func: fn,
        next: null
    }

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
        previousHead = this.head.func;
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

    var status       = PENDING;
    var resolveTicks = new LinkedList();
    var rejectTicks  = new LinkedList();
    var doneTick, exception, val, fn;

    vow.resolve = function(ret) {
        if (status === REJECTED || !resolveTicks.head) {
            handleDone();
            return;
        }

        status = RESOLVED;
        val = ret;

        fn = resolveTicks.removeHead();

        try {
            val = fn.call(this, ret);
        }

        catch (e) {
            status = REJECTED;
            exception = e;
            vow.reject(e);
            return;
        }

        vow.resolve(val);
    };

    vow.reject = function(e) {
        if (status === RESOLVED || !rejectTicks.head) {
            handleDone();
            return;
        }

        status = REJECTED;
        exception = e;

        fn = rejectTicks.removeHead();

        try {
            fn.call(this, exception);
        }

        catch (e) {
            exception = e;
            vow.reject(exception);
            return;
        }

        vow.reject(exception);
    };


    vow.promise = (function() {
        var promise = {}

        promise.then = function(func) {
            resolveTicks.addToTail(func);
            return promise;
        };

        promise.catch = function(func) {
            rejectTicks.addToTail(func);
            return promise;
        };

        promise.done = function(func) {
            doneTick = func;
        };

        return promise;

    })();

    return vow;
    
    function handleDone() {
        if (exception) {
            console.error(exception);
        }
        if (doneTick) {
            doneTick.call(this, val);
        }

        resolveTicks = null;
        rejectTicks  = null;
        doneTick     = null;
        exception    = null;
        val          = null;
        fn           = null;

    };
};

module.exports = Vow;

