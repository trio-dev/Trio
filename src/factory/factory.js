var EventBus = require('../eventBus/eventBus');
var IdGenerator = require('../helpers/IdGenerator')('factory');
var extend = require('../helpers/extend');
var defaults = require('../helpers/defaults');

var Factory = {};

Factory._constructor = function(opts) {
    this._initialize(opts);
};

Factory._constructor.prototype._initialize = function(opts) {
    var attributes = {};

    opts = opts || {};

    this.uuid = IdGenerator();
    this.resources = {};
    this.eventBus = opts.eventBus || new EventBus();
    this.eventBus = this.eventBus.register(this.uuid);

    this.set = function(key, val) {
        this._set(key, val, attributes);
    }

    this.unset = function(key) {
        this._unset(key, attributes);
    }

    this.get = function(key) {
        return this._get(key, attributes);
    }

    this.clone = function() {
        return JSON.parse(JSON.stringify(attributes));
    }

    if (typeof this.initialize === 'function') {
        this.initialize.apply(this, arguments);
    }

    this.set(defaults(opts, this.defaults));
    this.eventBus.publish('initialize', this, opts);
};

Factory._constructor.prototype._set = function(key, val, attributes) {
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

Factory._constructor.prototype._get = function(key, attributes) {
    if (typeof key === 'string') {
        return attributes[key];
    }  else if (typeof key === 'undefined') {
        return attributes;
    }
};

Factory._constructor.prototype._unset = function(key, attributes) {
    if (typeof key === 'string') {
        var ret = {};
        ret[key] = attributes[key];
        delete attributes[key];
        this.eventBus.publish('delete', this, ret);
        this.eventBus.publish('delete:' + key, this, ret[key]);
    } else if (typeof key === 'undefined') {
        for (var k in attributes) {
            this._unset(k, attributes);
        }
    }
};

Factory._constructor.prototype.sync = function(resource, id) {
    this.resources[resource] = resource;

    resource.eventBus.subscribe('change:' + id, function(ctx, attrs) {
        for (var k in attrs) {
            this.set(k, attrs[k]);
        }
    }.bind(this));

    resource.eventBus.subscribe('delete:' + id, function(ctx, attrs) {
        this.unset();
    }.bind(this))
};

Factory.extend = extend;

module.exports = Factory;
