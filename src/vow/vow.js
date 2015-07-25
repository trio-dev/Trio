window.LinkedList = function() {
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
    var previousHead = this.head.func;

    this.head = this.head.next;
    if (this.head === null) {
        this.tail = null;
        return null;
    }

    return previousHead;
};

var PENDING  = {},
    RESOLVED = {},
    REJECTED = {}; 

var Vow = function() {
    this.status = PENDING;
    this.queue = new LinkedList();
};

Vow.prototype.resolve = function(ret) {
    this.status = RESOLVED;

    while (this.queue.head) {
        var fn = this.queue.removeHead();
        var val = fn.call(this, ret);
        ret = val;
    }
};

Vow.prototype.then = function(func) {
    this.queue.addToTail(func);
};



module.exports = Vow;

