var EventBus = require('../eventBus');
var IdGenerator = require('../helpers/IdGenerator')('model');
var Model = {};

Model._constructor = function(opts) {
    this._initialize(opts);
};

Model._constructor.prototype._initialize = function(opts) {
    var attributes = {};
    this.id = IdGenerator();
    this.eventBus = opts.eventBus || new EventBus();
    this.eventBus.register(this.id);

    this.set = function(key, val) {
        this._set(key, val, attributes);
    }

    this.get = function(key) {
        return this._get(key, attributes);
    }

    this.read = function() {
        return JSON.parse(JSON.stringify(attributes));
    }

    if(typeof this.initialize === 'function') {
        this.initialize.apply(this, arguments);
    }

    this.set(opts);
    this.eventBus.publish('initialize', this, opts);
};

Model._constructor.prototype._set = function(key, val, attributes) {
    if (typeof key === 'object' && !Array.isArray(key)) {
        for (var k in key) {
            this._set(k, key[k], attributes);
        }
    }

    if (typeof key === 'string') {
        attributes[key] = val;
        var ret = {};
        ret[key] = val;
        this.eventBus.publish('change', this, ret);
        this.eventBus.publish('change:' + key, this, val);
    }
};

Model._constructor.prototype._get = function(key, attributes) {
    if (typeof key === 'string') {
        return attributes[key];
    }
};

module.exports = Model;
