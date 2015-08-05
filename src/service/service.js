var IdGenerator = require('../helpers/IdGenerator')('service');
var extend = require('../helpers/extend');

var Service = {};

Service._constructor = function(opts) {
    this._initialize(opts);
};

Service._constructor.prototype._initialize = function(opts) {
    this.id = IdGenerator();

    if (typeof this.initialize === 'function') {
        this.initialize.apply(this, arguments);
    }
};

Service._constructor.prototype.subscribeAll = function(target, events) {
    for (var evt in events) {
        var handler = events[evt];
        var fn = this[handler] = this[handler].bind(this)
        target.eventBus.subscribe(evt, fn);
    }
};

Service.extend = extend;

module.exports = Service;