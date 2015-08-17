var EventBus = function() {
    var events = {};
    this.register = function(id) {
        return (function(context) {
            var evt = {};
            evt.subscribe = function(event, func) {
                context._subscribe(event, func, id, events);
            };
            evt.publish = function(event, ctx, args) {
                context._publish(event, ctx, args, events);
            };
            evt.unsubscribe = function(event, func) {
                context._unsubscribe(event, func, id, events);
            };
            evt.unsubscribeAll = function(event) {
                context._unsubscribeAll(event, id, events);
            };
            return evt;
        })(this);
    };
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
                cbQueue.forEach(makeEachHandler.call(this, ctx, args));
            }
        }
    }

    function makeEachHandler(ctx, args) {
        return function(cb) {
            cb.call(this, ctx, args);
        };
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
