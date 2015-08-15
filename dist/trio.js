(function(){
"use strict";
function ajax(opts) {
    var xhr = new XMLHttpRequest();
    var vow = Vow();

    if (opts.encode) {
        opts.url += encodeURI(opts.encode(opts.payload));
    }

    xhr.open(opts.type.toUpperCase(), opts.url);
    xhr.setRequestHeader('Content-Type', opts.contentType);

    for (var header in opts.headers) {
        xhr.setRequestHeader(header, opts.headers[header]);
    }

    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status <= 299) {
            vow.resolve(xhr.responseText);
        } else {
            vow.reject(xhr.responseText);
        }
    };

    if (opts.encode) {
        xhr.send();
    } else {
        xhr.send(JSON.stringify(opts.payload));
    }

    return vow.promise;
}
function defaults(obj, def) {
    def = def || {};
    
    for (var key in def) {
        if (!obj[key]) {
            obj[key] = def[key];
        }
    }

    return obj;
}
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

    for (var met in methods) {
        if (Object.prototype.hasOwnProperty.call(methods, met)) {
            var method = methods[met];
            if (typeof method === 'function') {
                extended[met] = methods[met];
            } else {
                staticAttr[met] = methods[met];
            }
        }
    }

    child.prototype = Object.create(extended);

    return child;
}

function idGenerator(str) {
    var count = 1;

    return function() {
        var id = str + count;
        count++;
        return id;
    };
}

function param(object) {
    var encodedString = '';
    for (var prop in object) {
        if (object.hasOwnProperty(prop)) {
            if (encodedString.length > 0) {
                encodedString += '&';
            }
            encodedString += encodeURI(prop + '=' + object[prop]);
        }
    }
    return encodedString;
}

/*jshint es5: true */
var PENDING   = {},
    RESOLVED  = {},
    REJECTED  = {},
    FULFILLED = {};

var Vow = function() {
    var vow = {};
    var _promise = PromiseObj();

    vow.resolve = _promise.resolve;
    vow.reject  = _promise.reject;
    vow.promise = {
        then: _promise.then,
        catch: _promise.catch,
        done: _promise.done
    };

    return vow;

    function PromiseObj() {
        var state = PENDING;
        var value, onResolved, onRejected, onFullfilled, returnPromise;

        var ret = {

            resolve: function (val) {
                value = val;
                state = RESOLVED;

                if (onResolved) {
                    handleResolve(onResolved);
                } else {
                    handleDone(onFullfilled);
                }
            },

            reject: function (err) {
                value = err;
                state = REJECTED;

                if (onRejected) {
                    handleReject(onRejected);
                } else {
                    handleDone(onFullfilled);
                }
            },

            then: function (successCallback) {
                returnPromise = PromiseObj();
                handleResolve(successCallback);

                return {
                    then: returnPromise.then,
                    catch: ret.catch,
                    done: returnPromise.done
                };
            },

            catch: function (failCallback) {
                returnPromise = PromiseObj();
                handleReject(failCallback);

                return {
                    then: returnPromise.then,
                    catch: ret.catch,
                    done: returnPromise.done
                };
            },

            done: function (finallyCallback) {
                handleDone(finallyCallback);
            }
        };

        return ret;

        function handleDone(fn) {
            if (state === PENDING) {
                onFullfilled = fn;
                return;
            }

            if (state === RESOLVED && typeof fn === 'function') {
                state = FULFILLED;
                return fn.call(this, value);
            }

            if (state === REJECTED) {
                state = FULFILLED;
                throw value;
            }
        }

        function handleResolve(fn) {
            var error;
            if (state === PENDING) {
                onResolved = fn;
            }

            if (state === RESOLVED) {
                if (value && typeof value.then === 'function') {
                    value.then(ret.resolve);
                    return;
                }

                try {
                    value = fn.call(this, value);
                } catch (err) {
                    value = err;
                    error = true;
                }

                if (returnPromise) {
                    if (!error) {
                        returnPromise.resolve(value);
                        return;
                    }
                    returnPromise.reject(value);
                }
            }
        }

        function handleReject(fn) {
            var error;
            if (state === PENDING) {
                onRejected = fn;
            }

            if (state === REJECTED) {
                try {
                    value = fn.call(this, value);
                } catch (err) {
                    value = err;
                    error = true;
                }

                if (returnPromise) {
                    if (!error) {
                        returnPromise.resolve(value);
                        return;
                    }
                    returnPromise.reject(value);
                }
            }

            if (state === RESOLVED) {
                if (returnPromise) {
                    returnPromise.resolve(value);
                }
            }
        }
    }
};

var EventBus = function() {};

EventBus.prototype.register = function(id) {
    var events = {};
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

var Factory = {};
var factoryIdGenerator = idGenerator('factory');

Factory._constructor = function(opts) {
    this._initialize(opts);
};

Factory._constructor.prototype._initialize = function(opts) {
    var attributes = {};

    opts = opts || {};

    this.uuid = factoryIdGenerator();
    this.resources = {};
    this.eventBus = opts.eventBus || new EventBus();
    this.eventBus = this.eventBus.register(this.uuid);

    this.set = function(key, val) {
        this._set(key, val, attributes);
    };

    this.unset = function(key) {
        this._unset(key, attributes);
    };

    this.get = function(key) {
        return this._get(key, attributes);
    };

    this.clone = function() {
        return JSON.parse(JSON.stringify(attributes));
    };

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
    }.bind(this));
};

Factory.extend = extend;

var serviceIdGenerator = idGenerator('service');

var Service = {};

Service._constructor = function(opts) {
    this._initialize(opts);
};

Service._constructor.prototype._initialize = function(opts) {
    this.uuid = serviceIdGenerator();

    if (typeof this.initialize === 'function') {
        this.initialize.apply(this, arguments);
    }
};

Service._constructor.prototype.subscribeAll = function(target, events) {
    for (var evt in events) {
        var handler = events[evt];
        var fn = this[handler] = this[handler].bind(this);
        target.eventBus.subscribe(evt, fn);
    }
};

Service.extend = extend;

var componentIdGenerator = idGenerator('component');
var componentsStore = {};
var Component = {};

Component.register = function(opts) {
    if (componentsStore[opts.tagName]) {
        return componentsStore[opts.tagName];
    }

    var param = {};

    // Set Prototype of custom element
    var proto = Object.create(HTMLElement.prototype);

    _extendPrototype.call(proto, opts);

    proto.createdCallback = function() {
        var shadow = this.createShadowRoot();
        shadow.appendChild(opts.fragment.cloneNode(true));

        this.uuid = componentIdGenerator();

        if (opts.style) {
            shadow.appendChild(opts.style.cloneNode(true));
        }
        if (opts.onCreate) {
            opts.onCreate.apply(this, arguments);
        }
    };

    proto.attachedCallback = function() {
        if (opts.onAttach) {
            opts.onAttach.apply(this, arguments);
        }
        _addEventListeners.call(this, opts.events);
    };

    proto.detachedCallback = function() {
        if (opts.onDetach) {
            opts.onDetach.apply(this, arguments);
        }
    };

    proto.attributeChangedCallback = function(attrName, oldVal, newVal) {
        if (opts.onAttributesChange) {
            opts.onAttributesChange[attrName].apply(this, [oldVal, newVal]);
        }
    };

    param.prototype = proto;

    // Set base element (Optional)
    if (opts.extends) {
        param.extends = opts.extends;
    }

    // Register custom element
    componentsStore[opts.tagName] = document.registerElement(opts.tagName, param);
    return componentsStore[opts.tagName];
};

Component.extend = function(baseComponent, opts) {
    var Base = componentsStore[baseComponent];
    var param = {};
    // Set Prototype of custom element
    var proto = Object.create(HTMLElement.prototype);

    _extendPrototype.call(proto, opts);

    proto.createdCallback = function() {
        Base.prototype.createdCallback.apply(this, arguments);
        if (opts.onCreate) {
            opts.onCreate.apply(this, arguments);
        }
    };

    proto.attachedCallback = function() {
        Base.prototype.attachedCallback.apply(this, arguments);
        if (opts.onAttach) {
            opts.onAttach.apply(this, arguments);
        }
        _addEventListeners.call(this, opts.events);
    };

    proto.detachedCallback = function() {
        Base.prototype.detachedCallback.apply(this, arguments);
        if (opts.onDetach) {
            opts.onDetach.apply(this, arguments);
        }
    };

    proto.attributeChangedCallback = function(attrName, oldVal, newVal) {
        Base.prototype.attributeChangedCallback.apply(this, arguments);
        if (opts.onAttributesChange) {
            opts.onAttributesChange[attrName].apply(this, [oldVal, newVal]);
        }
    };

    param.prototype = proto;

    // Register custom element
    return document.registerElement(opts.tagName, param);
};

function _addEventListeners(events) {
    for (var evt in events) {
        var param = evt.split(' ');
        var eventName = param[0];
        var element = this.shadowRoot.querySelector(param[1]);
        var handler = events[evt];
        var fn = this[handler] = this[handler].bind(this);
        
        element.addEventListener(eventName, fn);
    }
}

function _extendPrototype(protos) {
    for (var proto in protos) {
        switch (proto) {
            case 'exends':
                break;
            case 'onCreate':
                break;
            case 'onDetach':
                break;
            case 'onAttributesChange':
                break;
            case 'onAttach':
                break;
            case 'tagName':
                break;
            case 'fragment':
                break;
            case 'style':
                break;
            case 'events':
                break;
            default:
                this[proto] = protos[proto];
        }
    }
}

var mixins = {};
var variables = {};

var Stylizer = function() {};

Stylizer.prototype.stringify = function(style) {
    var ret = '';

    for (var selector in style) {
        ret += selector + '{';
        var properties = style[selector];
        for (var prop in properties) {
            var setting = properties[prop];
            ret += prop + ':' + setting + ';';
        }
        ret = ret.slice(0, ret.length - 1);
        ret += '}';
    }

    return ret;
};

Stylizer.prototype.createStyleTag = function(style) {
    var tag = document.createElement('style');
    style = this.stringify(style);
    tag.innerText = style;
    return tag;
};

Stylizer.prototype.registerMixins = function(key, func) {
    mixins[key] = func;
};

Stylizer.prototype.registerVariables = function(key, val) {
    variables[key] = val;
};

Stylizer.prototype.getVariable = function(key) {
    if (!variables[key]) {
        console.error('Variable ' + key + ' does not exist.');
        return;
    }
    return variables[key];
};

Stylizer.prototype.toHex = function(rgb) {
    rgb = rgb.replace(' ', '').split(',');
    return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
};

Stylizer.prototype.toRGB = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 'rgb(' + [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ].join(',') + ')' : null;
};

Stylizer.prototype.toRGBa = function(hex, opacity) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 'rgba(' + [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        opacity
    ].join(',') + ')' : null;
};

Stylizer.prototype.getMixins = function(key) {
    if (!mixins[key]) {
        console.error('Mixin ' + key + ' does not exist.');
        return;
    }
    return mixins[key];
};

var moduleStore = {};

var Module = function() {};

Module.prototype.export = function(key, func) {
    if (typeof key !== 'string') {
        throw new Error('Module name is not a string.');
    }

    if (typeof func !== 'function') {
        throw new Error('Module is not a function.');
    }
    moduleStore[key] = function(done) {
        done(func());
    };
};

Module.prototype.import = function(modules) {
    var loaded = 0;
    var count  = Object.keys(modules);
    var vow = Vow();
    var ret = {};
    var url;

    _import(count.pop(), vow);

    vow.promise.and = {};
    vow.promise.and.export = function(key, func) {
        moduleStore[key] = function(done) {
            vow.promise
                .then(function(ret) {
                    moduleStore[key] = func.bind(this, ret);
                    return func.call(this, ret);
                }.bind(this))
                .done(done);
        };
    }.bind(this);

    vow.promise.and.import = function(modules) {
        return vow.promise.then(this.import.bind(this, modules));
    }.bind(this);

    return vow.promise;

    function _import(key, promise) {
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
                var defer = Vow();

                console.log('Loading ' + key + '...');

                defer.promise.then(function(data) {
                    ret[key] = data;
                    loaded++;
                    if (count.length === 0) {
                        promise.resolve(ret);
                    } else {
                        _import(count.pop(), promise);
                    }
                });

                script.remove();
                moduleStore[key](defer.resolve);
            }.bind(this, key);

            document.body.appendChild(script);
        } else {
            promise.resolve(module());
        }
    }
};

var Data = Factory.extend({
    ajax: function(opts){
        if (!opts.url) throw new Error('Url is required.');
        if (!opts.type) throw new Error('Request type is required.');

        opts.contentType = opts.contentType || 'application/json';
        opts.encode      = opts.encode || null;
        opts.payload     = opts.payload || null;
        opts.indexBy     = opts.indexBy || 'id';

        return ajax(opts)
                .then(_parse.bind(this))
                .then(_updateStore.bind(this));

        function _updateStore(rsp) {
            if (opts.type.toUpperCase() === 'DELETE') {
                if (Array.isArray(rsp)) {
                    rsp.forEach(function(d) {
                        this.unset(d[opts.indexBy], d);
                    }.bind(this));
                } else if (typeof rsp === 'object') {
                    this.unset(rsp[opts.indexBy], rsp);
                }
            } else {
                if (Array.isArray(rsp)) {
                    rsp.forEach(function(d) {
                        this.set(d[opts.indexBy], d);
                    }.bind(this));
                } else if (typeof rsp === 'object') {
                    this.set(rsp[opts.indexBy], rsp);
                }
            }
            return rsp;
        }

        function _parse(rsp) {
            if (opts.parse) {
                return opts.parse(rsp);
            } 
            return this.parse(rsp);
        }
    },

    parse: function(rsp) {
        return JSON.parse(rsp);
    }
});

var datastore = {};
var Resource = function() {};

Resource.prototype.register = function(name) {
    if (datastore[name]) {
        throw new Error('Resource ' + name + ' already exist.');
    }

    datastore[name] = new Data();
    return datastore[name];
};

Resource.prototype.get = function(name) {
    return datastore[name] ? datastore[name] : this.register(name);
};

var Renderer = function(){};

Renderer.prototype.createTemplate = function() {
    return new Template();
};

var Template = function(){
    this._currentState = [];
    this._queue = [];
    this._conditional = undefined;
    this._state = undefined;
    this._loop = undefined;
    this._start = undefined;

};

/**
 * Create DOM node
 * @param  {string} tagName Element name
 * @return {instance}       this
 */
Template.prototype.create = function(tagName){
    tagName = parseTag(tagName);
    var fn = function() {
        var el = document.createElement(tagName[0]);
        if (tagName[1] === '.') {
            el.className = tagName[2];
        } else if (tagName[1] === '#') {
            el.id = tagName[2];
        }
        this._currentState.push(el);
    }.bind(this);
    this._queue.push({
        type: 'open',
        fn: fn
    });
    return this;
};

Template.prototype.addClass = function(className) {
    var fn = function(d) {
        var el = grabLast.call(this);
        className = evaluate(d, className);
        var separator = el.className.length > 0 ? ' ' : '';
        if (!hasClass(el,className)) {
            el.className += separator + className;
        }
    }.bind(this);
    this._queue.push({
        type: 'addClass',
        fn: fn
    });
    return this;
};

Template.prototype.text = function(content) {
    var fn = function(d) {
        var el = grabLast.call(this);
        el.textContent = evaluate(d, content);
    }.bind(this);
    this._queue.push({
        type: 'text',
        fn: fn
    });
    return this;
};

Template.prototype.attr = function(attr, val) {
    var fn = function(d) {
        var el = grabLast.call(this);
        el.setAttribute(evaluate(d, attr), evaluate(d, val));
    }.bind(this);
    this._queue.push({
        type: 'attr',
        fn: fn
    });
    return this;
};

Template.prototype.style = function(attr, val) {
    var fn = function(d) {
        var el = grabLast.call(this);
        el.style[evaluate(d, attr)] = evaluate(d, val);
    }.bind(this);
    this._queue.push({
        type: 'style',
        fn: fn
    });
    return this;
};

Template.prototype.removeClass = function(className) {
    var fn = function(d) {
        var el = grabLast.call(this);
        className = evaluate(d, className);
        if (hasClass(el,className)) {
            var reg = new RegExp('(\\s|^)'+className+'(\\s|$)');
            el.className = el.className.replace(reg,' ');
        }
    }.bind(this);
    this._queue.push({
        type: 'removeClass',
        fn: fn
    });
    return this;
};

Template.prototype.append = function() {
    var fn = function(d) {
        var el = this._currentState.pop();
        if (this._currentState.length === 0) {
            this.previousFragment.appendChild(el);
        } else {
            var parent = grabLast.call(this);
            parent.appendChild(el);
        }
    }.bind(this);
    this._queue.push({
        type: 'close',
        fn: fn
    });
    return this;
};

Template.prototype.appendLast = function() {
  var fn = function(d) {
      var el = this._currentState.pop();
      this.previousFragment.appendChild(el);
  }.bind(this);
  this._queue.push({
      type: 'end',
      fn: fn
  });
  return this;  
};

Template.prototype.if = function(funcOrKey) {
    var fn = function(d) {
        this._state = 'conditional';
        funcOrKey = evaluate(d, funcOrKey);
        this._conditional = !!funcOrKey;
    }.bind(this);
    this._queue.push({
        type: 'if',
        fn: fn
    });
    return this;
};

Template.prototype.else = function() {
    var fn = function(d) {
        this._conditional = !this._conditional;
    }.bind(this);
    this._queue.push({
        type: 'else',
        fn: fn
    });
    return this;
};

Template.prototype.each = function(funcOrKey) {
    var fn = function(d, i) {
        this._loop  = evaluate(d, funcOrKey);
        this._state = 'loop';
        this._start = i;
    }.bind(this);
    this._queue.push({
        type: 'each',
        fn: fn
    });
    return this;
};

Template.prototype.done = function() {
    var fn = function(d, i) {
        this._conditional = undefined;
        this._state       = undefined;
    }.bind(this);
    this._queue.push({
        type: 'done',
        fn: fn
    });
    return this;
};

Template.prototype.render = function(data) {
    this.previousFragment = document.createDocumentFragment();
    this._queue.forEach(function(q, i) {
        switch (this._state) {
            case 'conditional':
                if (this._conditional || q.type === 'else' || q.type === 'done') {
                    q.fn(data, i);
                }
                break;
            case 'loop':
                if (q.type === 'done') {
                    this._loop.forEach(function(l, j) {
                        for (var start = this._start + 1; start < i; start++) {
                            var loopFn = this._queue[start];
                            loopFn.fn(l, j);
                        }
                    }.bind(this));
                    q.fn(data, i);
                }
                break;
            default:
                q.fn(data, i);
                break;
                
        }
    }.bind(this));

    return this.previousFragment;
};

function grabLast() {
    return this._currentState[this._currentState.length - 1];
}

function hasClass(el, className) {
  return !!el.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
}

function parseTag(tag) {
    tag = tag.replace(/[.#]/, function(d) { return ',' + d + ',';})
             .split(',');
    return tag;
}

function evaluate(data, funcOrString) {
    switch (typeof funcOrString) {
        case 'function':
            return funcOrString.apply(this, arguments);
        case 'string':
            return funcOrString;
    }
}

var gEventBus = new EventBus();;

var Trio = {
    Factory: Factory,
    Service: Service,
    Component: Component,
    Vow: Vow,
    Stylizer: new Stylizer(),
    Renderer: new Renderer(),
    Module: new Module(),
    Resource: new Resource()
}

Trio.registerGlobalEventBus = function(id) {
    return gEventBus.register(id);
};

if (module && module.exports) {
    module.exports = Trio;
} else {
    window.Trio = Trio;
}

})();