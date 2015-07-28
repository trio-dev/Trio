var Model = require('./model/model');
var Controller = require('./controller/controller');
var View = require('./view/view');
var Stylizer = require('./stylizer/stylizer');
var EventBus = require('./eventBus/eventBus');
var Module = require('./module/module');
var Vow = require('./vow/vow');

var gEventBus;

var Trio = {
    Model: Model,
    Controller: Controller,
    View: View,
    Vow: Vow
}

for (var key in Trio) {
    Trio[key].extend = extend;
}

Trio.start = function() {
    gEventBus = new EventBus();
    this.Stylizer = new Stylizer();
    this.Module = new Module();
};

Trio.getGlobalEventBus = function() {
    if (!gEventBus) {
        throw new Error('Need to start applicaiton first.');
    }
    return gEventBus;
};

module.exports = Trio;

function extend(methods) {
    var parent = this._constructor;

    if (!parent) {
        return;
    }

    var staticAttr = {};
    var child = function() {
        for (var key in staticAttr) {
            this[key] = staticAttr[key];
        }
        parent.apply(this, arguments);
    };
    
    var extended = {};

    for (var prop in parent.prototype) {
        if (Object.prototype.hasOwnProperty.call(parent.prototype, prop)) {
            extended[prop] = parent.prototype[prop];
        }
    }

    for (var prop in methods) {
        if (Object.prototype.hasOwnProperty.call(methods, prop)) {
            var method = methods[prop];
            if (typeof method === 'function') {
                extended[prop] = methods[prop];
            } else {
                staticAttr[prop] = methods[prop];
            }
        }
    }

    child.prototype = Object.create(extended);

    return child;
}