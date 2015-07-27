var Model = require('./model/model');
var Controller = require('./controller/controller');
var View = require('./view/view');
var Stylizer = require('./stylizer/stylizer');
var EventBus = require('./eventBus/eventBus');
var Vow = require('./vow/vow');

var gEventBus;
window.moduleStore = {};

var Trio = {
    Model: Model,
    Controller: Controller,
    View: View,
    Stylizer: Stylizer,
    Vow: Vow
}

for (var key in Trio) {
    Trio[key].extend = extend;
}

Trio.start = function(cb) {
    gEventBus = new EventBus();
    cb.apply(this, arguments);
};

Trio.getGlobalEventBus = function() {
    if (!gEventBus) {
        throw new Error('Need to start applicaiton first.');
    }
    return gEventBus;
};

Trio.export = function(key, func) {
    if (typeof key !== 'string') {
        throw new Error('Module name is not a string.');
    }

    if (typeof func !== 'function') {
        throw new Error('Module is not a function.');
    }
    moduleStore[key] = func;
};

Trio.import = function(modules) {
    var loaded = 0;
    var count  = Object.keys(modules);
    var vow = Trio.Vow();
    var ret = {};
    var url;

    _import(count.pop());
    return vow.promise;

    function _import(key) {
        var url = modules[key];

        if (typeof key !== 'string') {
            throw new Error('Module name is not a string.');
        }

        if (typeof url !== 'string') {
            throw new Error('URL is not a string.');
        }

        var module = moduleStore[key];

        if (!module) {
            var script = document.createElement('script');
            script.type = "text/javascript";
            script.src = url;
            script.onload = function() {
                var defer = Trio.Vow();

                defer.promise.then(function(data) {
                    ret[key] = data;
                    loaded++;
                    if (count.length === 0) {
                        vow.resolve(ret);
                    } else {
                        _import(count.pop());
                    }
                });
                script.remove()
                moduleStore[key].call(this, defer.resolve);
            }.bind(this, key);
            document.body.appendChild(script);
        }
    }
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