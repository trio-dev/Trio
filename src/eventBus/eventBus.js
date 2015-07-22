var EventBus = function() {
};

EventBus.prototype.register = function(id) {
    var id = id;
    var events = {};
    this.subscribe = function(event, func) {
        this._subscribe(event, func, id, events);
    };
    this.publish = function(event, ctx, args) {
        this._publish(event, ctx, args, events);
    };
    this.unsubscribe = function(event, func) {
        this._unsubscribe(event, func, id, events);
    };
    this.unsubscribeAll = function(event) {
        this._unsubscribeAll(event, id, events);
    }
};

EventBus.prototype._subscribe = function(event, func, id, events) {
    if (!events[event]) {
        events[event] = {};
    }

    if (!events[event][id]) {
        events[event][id] = [];
    }

    if (typeof func !== 'function') {
        throw new Error('A callback function must be passed in to subscribe');
    }
    
    events[event][id].push(func);
};

EventBus.prototype._publish = function(event, ctx, args, events) {
    ctx = ctx || null;
    args = args || null;

    var eventBucket = events[event];

    if (eventBucket) {
        for (var bucket in eventBucket) {
            var cbQueue = eventBucket[bucket];
            if (Array.isArray(cbQueue)) {
                cbQueue.forEach(function(cb) {
                    cb.call(this, ctx, args);
                });
            }
        }
    }
};

EventBus.prototype._unsubscribe = function(event, func, id, events) {
    var bucket = events[event];

    if (bucket) {
        var queue = bucket[id];

        queue.forEach(function(fn, i) {
            if(fn === func) {
                queue.splice(i, 1);
                return;
            }
        }.bind(this));
    }
};

EventBus.prototype._unsubscribeAll = function(event, id, events) {
    if (event) {
        unsubsribeOne(event);
        return;
    } 

    for (var evt in events) {
        unsubsribeOne(evt);
    }

    function unsubsribeOne(event) {
        var bucket = events[event];

        if (bucket && bucket[id]) {
            delete bucket[id];
        }
    }
};

module.exports = EventBus;
