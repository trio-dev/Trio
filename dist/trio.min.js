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
                } else if (onFullfilled) {
                    handleDone(onFullfilled);
                }
            },

            reject: function (err) {
                value = err;
                state = REJECTED;

                if (onRejected) {
                    handleReject(onRejected);
                } else if (onFullfilled) {
                    handleDone(onFullfilled);
                }
            },

            then: function (successCallback) {
                returnPromise = PromiseObj();
                handleResolve(successCallback);

                return {
                    then: returnPromise.then,
                    catch: returnPromise.catch,
                    done: returnPromise.done
                };
            },

            catch: function (failCallback) {
                returnPromise = PromiseObj();
                handleReject(failCallback);

                return {
                    then: returnPromise.then,
                    catch: returnPromise.catch,
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
                onFullfilled = fn || 'done';
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
    Resource: new Resource(),
    VERSION: '0.1.2'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFqYXguanMiLCJkZWZhdWx0cy5qcyIsImV4dGVuZC5qcyIsImlkR2VuZXJhdG9yLmpzIiwicGFyYW0uanMiLCJ2b3cuanMiLCJldmVudEJ1cy5qcyIsImZhY3RvcnkuanMiLCJzZXJ2aWNlLmpzIiwiY29tcG9uZW50LmpzIiwic3R5bGl6ZXIuanMiLCJtb2R1bGUuanMiLCJyZXNvdXJjZS5qcyIsInJlbmRlcmVyLmpzIiwiaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InRyaW8uanMiLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBhamF4KG9wdHMpIHtcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgdmFyIHZvdyA9IFZvdygpO1xuXG4gICAgaWYgKG9wdHMuZW5jb2RlKSB7XG4gICAgICAgIG9wdHMudXJsICs9IGVuY29kZVVSSShvcHRzLmVuY29kZShvcHRzLnBheWxvYWQpKTtcbiAgICB9XG5cbiAgICB4aHIub3BlbihvcHRzLnR5cGUudG9VcHBlckNhc2UoKSwgb3B0cy51cmwpO1xuICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCBvcHRzLmNvbnRlbnRUeXBlKTtcblxuICAgIGZvciAodmFyIGhlYWRlciBpbiBvcHRzLmhlYWRlcnMpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyLCBvcHRzLmhlYWRlcnNbaGVhZGVyXSk7XG4gICAgfVxuXG4gICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8PSAyOTkpIHtcbiAgICAgICAgICAgIHZvdy5yZXNvbHZlKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdm93LnJlamVjdCh4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAob3B0cy5lbmNvZGUpIHtcbiAgICAgICAgeGhyLnNlbmQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB4aHIuc2VuZChKU09OLnN0cmluZ2lmeShvcHRzLnBheWxvYWQpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdm93LnByb21pc2U7XG59IiwiZnVuY3Rpb24gZGVmYXVsdHMob2JqLCBkZWYpIHtcbiAgICBkZWYgPSBkZWYgfHwge307XG4gICAgXG4gICAgZm9yICh2YXIga2V5IGluIGRlZikge1xuICAgICAgICBpZiAoIW9ialtrZXldKSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IGRlZltrZXldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn0iLCJmdW5jdGlvbiBleHRlbmQobWV0aG9kcykge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLl9jb25zdHJ1Y3RvcjtcblxuICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGljQXR0ciA9IHt9O1xuICAgIHZhciBjaGlsZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3RhdGljQXR0cikge1xuICAgICAgICAgICAgdGhpc1trZXldID0gc3RhdGljQXR0cltrZXldO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgXG4gICAgdmFyIGV4dGVuZGVkID0ge307XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHBhcmVudC5wcm90b3R5cGUpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJlbnQucHJvdG90eXBlLCBwcm9wKSkge1xuICAgICAgICAgICAgZXh0ZW5kZWRbcHJvcF0gPSBwYXJlbnQucHJvdG90eXBlW3Byb3BdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgbWV0IGluIG1ldGhvZHMpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtZXRob2RzLCBtZXQpKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gbWV0aG9kc1ttZXRdO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBleHRlbmRlZFttZXRdID0gbWV0aG9kc1ttZXRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNBdHRyW21ldF0gPSBtZXRob2RzW21ldF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKGV4dGVuZGVkKTtcblxuICAgIHJldHVybiBjaGlsZDtcbn1cbiIsImZ1bmN0aW9uIGlkR2VuZXJhdG9yKHN0cikge1xuICAgIHZhciBjb3VudCA9IDE7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpZCA9IHN0ciArIGNvdW50O1xuICAgICAgICBjb3VudCsrO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcbn1cbiIsImZ1bmN0aW9uIHBhcmFtKG9iamVjdCkge1xuICAgIHZhciBlbmNvZGVkU3RyaW5nID0gJyc7XG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmplY3QpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgaWYgKGVuY29kZWRTdHJpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGVuY29kZWRTdHJpbmcgKz0gJyYnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5jb2RlZFN0cmluZyArPSBlbmNvZGVVUkkocHJvcCArICc9JyArIG9iamVjdFtwcm9wXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVuY29kZWRTdHJpbmc7XG59XG4iLCJ2YXIgUEVORElORyAgID0ge30sXG4gICAgUkVTT0xWRUQgID0ge30sXG4gICAgUkVKRUNURUQgID0ge30sXG4gICAgRlVMRklMTEVEID0ge307XG5cbnZhciBWb3cgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdm93ID0ge307XG4gICAgdmFyIF9wcm9taXNlID0gUHJvbWlzZU9iaigpO1xuXG4gICAgdm93LnJlc29sdmUgPSBfcHJvbWlzZS5yZXNvbHZlO1xuICAgIHZvdy5yZWplY3QgID0gX3Byb21pc2UucmVqZWN0O1xuICAgIHZvdy5wcm9taXNlID0ge1xuICAgICAgICB0aGVuOiBfcHJvbWlzZS50aGVuLFxuICAgICAgICBjYXRjaDogX3Byb21pc2UuY2F0Y2gsXG4gICAgICAgIGRvbmU6IF9wcm9taXNlLmRvbmVcbiAgICB9O1xuXG4gICAgcmV0dXJuIHZvdztcblxuICAgIGZ1bmN0aW9uIFByb21pc2VPYmooKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9IFBFTkRJTkc7XG4gICAgICAgIHZhciB2YWx1ZSwgb25SZXNvbHZlZCwgb25SZWplY3RlZCwgb25GdWxsZmlsbGVkLCByZXR1cm5Qcm9taXNlO1xuXG4gICAgICAgIHZhciByZXQgPSB7XG5cbiAgICAgICAgICAgIHJlc29sdmU6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbDtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IFJFU09MVkVEO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9uUmVzb2x2ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlUmVzb2x2ZShvblJlc29sdmVkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9uRnVsbGZpbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVEb25lKG9uRnVsbGZpbGxlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmVqZWN0OiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBlcnI7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBSRUpFQ1RFRDtcblxuICAgICAgICAgICAgICAgIGlmIChvblJlamVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVJlamVjdChvblJlamVjdGVkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9uRnVsbGZpbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVEb25lKG9uRnVsbGZpbGxlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdGhlbjogZnVuY3Rpb24gKHN1Y2Nlc3NDYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVyblByb21pc2UgPSBQcm9taXNlT2JqKCk7XG4gICAgICAgICAgICAgICAgaGFuZGxlUmVzb2x2ZShzdWNjZXNzQ2FsbGJhY2spO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdGhlbjogcmV0dXJuUHJvbWlzZS50aGVuLFxuICAgICAgICAgICAgICAgICAgICBjYXRjaDogcmV0dXJuUHJvbWlzZS5jYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgZG9uZTogcmV0dXJuUHJvbWlzZS5kb25lXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNhdGNoOiBmdW5jdGlvbiAoZmFpbENhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuUHJvbWlzZSA9IFByb21pc2VPYmooKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVSZWplY3QoZmFpbENhbGxiYWNrKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHRoZW46IHJldHVyblByb21pc2UudGhlbixcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2g6IHJldHVyblByb21pc2UuY2F0Y2gsXG4gICAgICAgICAgICAgICAgICAgIGRvbmU6IHJldHVyblByb21pc2UuZG9uZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBkb25lOiBmdW5jdGlvbiAoZmluYWxseUNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlRG9uZShmaW5hbGx5Q2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiByZXQ7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlRG9uZShmbikge1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSBQRU5ESU5HKSB7XG4gICAgICAgICAgICAgICAgb25GdWxsZmlsbGVkID0gZm4gfHwgJ2RvbmUnO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN0YXRlID09PSBSRVNPTFZFRCAmJiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IEZVTEZJTExFRDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbCh0aGlzLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gUkVKRUNURUQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IEZVTEZJTExFRDtcbiAgICAgICAgICAgICAgICB0aHJvdyB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZVJlc29sdmUoZm4pIHtcbiAgICAgICAgICAgIHZhciBlcnJvcjtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gUEVORElORykge1xuICAgICAgICAgICAgICAgIG9uUmVzb2x2ZWQgPSBmbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN0YXRlID09PSBSRVNPTFZFRCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZS50aGVuKHJldC5yZXNvbHZlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZm4uY2FsbCh0aGlzLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZXJyO1xuICAgICAgICAgICAgICAgICAgICBlcnJvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldHVyblByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuUHJvbWlzZS5yZXNvbHZlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm5Qcm9taXNlLnJlamVjdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlUmVqZWN0KGZuKSB7XG4gICAgICAgICAgICB2YXIgZXJyb3I7XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgICAgICAgICAgICBvblJlamVjdGVkID0gZm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gUkVKRUNURUQpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGZuLmNhbGwodGhpcywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXR1cm5Qcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblByb21pc2UucmVzb2x2ZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuUHJvbWlzZS5yZWplY3QodmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN0YXRlID09PSBSRVNPTFZFRCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXR1cm5Qcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblByb21pc2UucmVzb2x2ZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsInZhciBFdmVudEJ1cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBldmVudHMgPSB7fTtcbiAgICB0aGlzLnJlZ2lzdGVyID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIChmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZXZ0ID0ge307XG4gICAgICAgICAgICBldnQuc3Vic2NyaWJlID0gZnVuY3Rpb24oZXZlbnQsIGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0Ll9zdWJzY3JpYmUoZXZlbnQsIGZ1bmMsIGlkLCBldmVudHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGV2dC5wdWJsaXNoID0gZnVuY3Rpb24oZXZlbnQsIGN0eCwgYXJncykge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuX3B1Ymxpc2goZXZlbnQsIGN0eCwgYXJncywgZXZlbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBldnQudW5zdWJzY3JpYmUgPSBmdW5jdGlvbihldmVudCwgZnVuYykge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuX3Vuc3Vic2NyaWJlKGV2ZW50LCBmdW5jLCBpZCwgZXZlbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBldnQudW5zdWJzY3JpYmVBbGwgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuX3Vuc3Vic2NyaWJlQWxsKGV2ZW50LCBpZCwgZXZlbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZXZ0O1xuICAgICAgICB9KSh0aGlzKTtcbiAgICB9O1xufTtcblxuRXZlbnRCdXMucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbihldmVudCwgZnVuYywgaWQsIGV2ZW50cykge1xuICAgIGlmICghZXZlbnRzW2V2ZW50XSkge1xuICAgICAgICBldmVudHNbZXZlbnRdID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFldmVudHNbZXZlbnRdW2lkXSkge1xuICAgICAgICBldmVudHNbZXZlbnRdW2lkXSA9IFtdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgY2FsbGJhY2sgZnVuY3Rpb24gbXVzdCBiZSBwYXNzZWQgaW4gdG8gc3Vic2NyaWJlJyk7XG4gICAgfVxuICAgIFxuICAgIGV2ZW50c1tldmVudF1baWRdLnB1c2goZnVuYyk7XG59O1xuXG5FdmVudEJ1cy5wcm90b3R5cGUuX3B1Ymxpc2ggPSBmdW5jdGlvbihldmVudCwgY3R4LCBhcmdzLCBldmVudHMpIHtcbiAgICBjdHggPSBjdHggfHwgbnVsbDtcbiAgICBhcmdzID0gYXJncyB8fCBudWxsO1xuXG4gICAgdmFyIGV2ZW50QnVja2V0ID0gZXZlbnRzW2V2ZW50XTtcblxuICAgIGlmIChldmVudEJ1Y2tldCkge1xuICAgICAgICBmb3IgKHZhciBidWNrZXQgaW4gZXZlbnRCdWNrZXQpIHtcbiAgICAgICAgICAgIHZhciBjYlF1ZXVlID0gZXZlbnRCdWNrZXRbYnVja2V0XTtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNiUXVldWUpKSB7XG4gICAgICAgICAgICAgICAgY2JRdWV1ZS5mb3JFYWNoKG1ha2VFYWNoSGFuZGxlci5jYWxsKHRoaXMsIGN0eCwgYXJncykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUVhY2hIYW5kbGVyKGN0eCwgYXJncykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oY2IpIHtcbiAgICAgICAgICAgIGNiLmNhbGwodGhpcywgY3R4LCBhcmdzKTtcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5FdmVudEJ1cy5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlID0gZnVuY3Rpb24oZXZlbnQsIGZ1bmMsIGlkLCBldmVudHMpIHtcbiAgICB2YXIgYnVja2V0ID0gZXZlbnRzW2V2ZW50XTtcblxuICAgIGlmIChidWNrZXQpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gYnVja2V0W2lkXTtcblxuICAgICAgICBxdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uKGZuLCBpKSB7XG4gICAgICAgICAgICBpZihmbiA9PT0gZnVuYykge1xuICAgICAgICAgICAgICAgIHF1ZXVlLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfVxufTtcblxuRXZlbnRCdXMucHJvdG90eXBlLl91bnN1YnNjcmliZUFsbCA9IGZ1bmN0aW9uKGV2ZW50LCBpZCwgZXZlbnRzKSB7XG4gICAgaWYgKGV2ZW50KSB7XG4gICAgICAgIHVuc3Vic3JpYmVPbmUoZXZlbnQpO1xuICAgICAgICByZXR1cm47XG4gICAgfSBcblxuICAgIGZvciAodmFyIGV2dCBpbiBldmVudHMpIHtcbiAgICAgICAgdW5zdWJzcmliZU9uZShldnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuc3Vic3JpYmVPbmUoZXZlbnQpIHtcbiAgICAgICAgdmFyIGJ1Y2tldCA9IGV2ZW50c1tldmVudF07XG5cbiAgICAgICAgaWYgKGJ1Y2tldCAmJiBidWNrZXRbaWRdKSB7XG4gICAgICAgICAgICBkZWxldGUgYnVja2V0W2lkXTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJ2YXIgRmFjdG9yeSA9IHt9O1xudmFyIGZhY3RvcnlJZEdlbmVyYXRvciA9IGlkR2VuZXJhdG9yKCdmYWN0b3J5Jyk7XG5cbkZhY3RvcnkuX2NvbnN0cnVjdG9yID0gZnVuY3Rpb24ob3B0cykge1xuICAgIHRoaXMuX2luaXRpYWxpemUob3B0cyk7XG59O1xuXG5GYWN0b3J5Ll9jb25zdHJ1Y3Rvci5wcm90b3R5cGUuX2luaXRpYWxpemUgPSBmdW5jdGlvbihvcHRzKSB7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSB7fTtcblxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gICAgdGhpcy51dWlkID0gZmFjdG9yeUlkR2VuZXJhdG9yKCk7XG4gICAgdGhpcy5yZXNvdXJjZXMgPSB7fTtcbiAgICB0aGlzLmV2ZW50QnVzID0gb3B0cy5ldmVudEJ1cyB8fCBuZXcgRXZlbnRCdXMoKTtcbiAgICB0aGlzLmV2ZW50QnVzID0gdGhpcy5ldmVudEJ1cy5yZWdpc3Rlcih0aGlzLnV1aWQpO1xuXG4gICAgdGhpcy5zZXQgPSBmdW5jdGlvbihrZXksIHZhbCkge1xuICAgICAgICB0aGlzLl9zZXQoa2V5LCB2YWwsIGF0dHJpYnV0ZXMpO1xuICAgIH07XG5cbiAgICB0aGlzLnVuc2V0ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHRoaXMuX3Vuc2V0KGtleSwgYXR0cmlidXRlcyk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nZXQoa2V5LCBhdHRyaWJ1dGVzKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShhdHRyaWJ1dGVzKSk7XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgdGhpcy5pbml0aWFsaXplID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0KGRlZmF1bHRzKG9wdHMsIHRoaXMuZGVmYXVsdHMpKTtcbiAgICB0aGlzLmV2ZW50QnVzLnB1Ymxpc2goJ2luaXRpYWxpemUnLCB0aGlzLCBvcHRzKTtcbn07XG5cbkZhY3RvcnkuX2NvbnN0cnVjdG9yLnByb3RvdHlwZS5fc2V0ID0gZnVuY3Rpb24oa2V5LCB2YWwsIGF0dHJpYnV0ZXMpIHtcbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICBmb3IgKHZhciBrIGluIGtleSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0KGssIGtleVtrXSwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXR0cmlidXRlc1trZXldID0gdmFsO1xuICAgICAgICB2YXIgcmV0ID0ge307XG4gICAgICAgIHJldFtrZXldID0gdmFsO1xuICAgICAgICB0aGlzLmV2ZW50QnVzLnB1Ymxpc2goJ2NoYW5nZScsIHRoaXMsIHJldCk7XG4gICAgICAgIHRoaXMuZXZlbnRCdXMucHVibGlzaCgnY2hhbmdlOicgKyBrZXksIHRoaXMsIHZhbCk7XG4gICAgfVxufTtcblxuRmFjdG9yeS5fY29uc3RydWN0b3IucHJvdG90eXBlLl9nZXQgPSBmdW5jdGlvbihrZXksIGF0dHJpYnV0ZXMpIHtcbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZXNba2V5XTtcbiAgICB9ICBlbHNlIGlmICh0eXBlb2Yga2V5ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gYXR0cmlidXRlcztcbiAgICB9XG59O1xuXG5GYWN0b3J5Ll9jb25zdHJ1Y3Rvci5wcm90b3R5cGUuX3Vuc2V0ID0gZnVuY3Rpb24oa2V5LCBhdHRyaWJ1dGVzKSB7XG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciByZXQgPSB7fTtcbiAgICAgICAgcmV0W2tleV0gPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIHRoaXMuZXZlbnRCdXMucHVibGlzaCgnZGVsZXRlJywgdGhpcywgcmV0KTtcbiAgICAgICAgdGhpcy5ldmVudEJ1cy5wdWJsaXNoKCdkZWxldGU6JyArIGtleSwgdGhpcywgcmV0W2tleV0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGtleSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICB0aGlzLl91bnNldChrLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkZhY3RvcnkuX2NvbnN0cnVjdG9yLnByb3RvdHlwZS5zeW5jID0gZnVuY3Rpb24ocmVzb3VyY2UsIGlkKSB7XG4gICAgdGhpcy5yZXNvdXJjZXNbcmVzb3VyY2VdID0gcmVzb3VyY2U7XG5cbiAgICByZXNvdXJjZS5ldmVudEJ1cy5zdWJzY3JpYmUoJ2NoYW5nZTonICsgaWQsIGZ1bmN0aW9uKGN0eCwgYXR0cnMpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBhdHRycykge1xuICAgICAgICAgICAgdGhpcy5zZXQoaywgYXR0cnNba10pO1xuICAgICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHJlc291cmNlLmV2ZW50QnVzLnN1YnNjcmliZSgnZGVsZXRlOicgKyBpZCwgZnVuY3Rpb24oY3R4LCBhdHRycykge1xuICAgICAgICB0aGlzLnVuc2V0KCk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbkZhY3RvcnkuZXh0ZW5kID0gZXh0ZW5kO1xuIiwidmFyIHNlcnZpY2VJZEdlbmVyYXRvciA9IGlkR2VuZXJhdG9yKCdzZXJ2aWNlJyk7XG5cbnZhciBTZXJ2aWNlID0ge307XG5cblNlcnZpY2UuX2NvbnN0cnVjdG9yID0gZnVuY3Rpb24ob3B0cykge1xuICAgIHRoaXMuX2luaXRpYWxpemUob3B0cyk7XG59O1xuXG5TZXJ2aWNlLl9jb25zdHJ1Y3Rvci5wcm90b3R5cGUuX2luaXRpYWxpemUgPSBmdW5jdGlvbihvcHRzKSB7XG4gICAgdGhpcy51dWlkID0gc2VydmljZUlkR2VuZXJhdG9yKCk7XG5cbiAgICBpZiAodHlwZW9mIHRoaXMuaW5pdGlhbGl6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59O1xuXG5TZXJ2aWNlLl9jb25zdHJ1Y3Rvci5wcm90b3R5cGUuc3Vic2NyaWJlQWxsID0gZnVuY3Rpb24odGFyZ2V0LCBldmVudHMpIHtcbiAgICBmb3IgKHZhciBldnQgaW4gZXZlbnRzKSB7XG4gICAgICAgIHZhciBoYW5kbGVyID0gZXZlbnRzW2V2dF07XG4gICAgICAgIHZhciBmbiA9IHRoaXNbaGFuZGxlcl0gPSB0aGlzW2hhbmRsZXJdLmJpbmQodGhpcyk7XG4gICAgICAgIHRhcmdldC5ldmVudEJ1cy5zdWJzY3JpYmUoZXZ0LCBmbik7XG4gICAgfVxufTtcblxuU2VydmljZS5leHRlbmQgPSBleHRlbmQ7XG4iLCJ2YXIgY29tcG9uZW50SWRHZW5lcmF0b3IgPSBpZEdlbmVyYXRvcignY29tcG9uZW50Jyk7XG52YXIgY29tcG9uZW50c1N0b3JlID0ge307XG52YXIgQ29tcG9uZW50ID0ge307XG5cbkNvbXBvbmVudC5yZWdpc3RlciA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICBpZiAoY29tcG9uZW50c1N0b3JlW29wdHMudGFnTmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudHNTdG9yZVtvcHRzLnRhZ05hbWVdO1xuICAgIH1cblxuICAgIHZhciBwYXJhbSA9IHt9O1xuXG4gICAgLy8gU2V0IFByb3RvdHlwZSBvZiBjdXN0b20gZWxlbWVudFxuICAgIHZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcblxuICAgIF9leHRlbmRQcm90b3R5cGUuY2FsbChwcm90bywgb3B0cyk7XG5cbiAgICBwcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNoYWRvdyA9IHRoaXMuY3JlYXRlU2hhZG93Um9vdCgpO1xuICAgICAgICBzaGFkb3cuYXBwZW5kQ2hpbGQob3B0cy5mcmFnbWVudC5jbG9uZU5vZGUodHJ1ZSkpO1xuXG4gICAgICAgIHRoaXMudXVpZCA9IGNvbXBvbmVudElkR2VuZXJhdG9yKCk7XG5cbiAgICAgICAgaWYgKG9wdHMuc3R5bGUpIHtcbiAgICAgICAgICAgIHNoYWRvdy5hcHBlbmRDaGlsZChvcHRzLnN0eWxlLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdHMub25DcmVhdGUpIHtcbiAgICAgICAgICAgIG9wdHMub25DcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwcm90by5hdHRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChvcHRzLm9uQXR0YWNoKSB7XG4gICAgICAgICAgICBvcHRzLm9uQXR0YWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgX2FkZEV2ZW50TGlzdGVuZXJzLmNhbGwodGhpcywgb3B0cy5ldmVudHMpO1xuICAgIH07XG5cbiAgICBwcm90by5kZXRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChvcHRzLm9uRGV0YWNoKSB7XG4gICAgICAgICAgICBvcHRzLm9uRGV0YWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcHJvdG8uYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrID0gZnVuY3Rpb24oYXR0ck5hbWUsIG9sZFZhbCwgbmV3VmFsKSB7XG4gICAgICAgIGlmIChvcHRzLm9uQXR0cmlidXRlc0NoYW5nZSkge1xuICAgICAgICAgICAgb3B0cy5vbkF0dHJpYnV0ZXNDaGFuZ2VbYXR0ck5hbWVdLmFwcGx5KHRoaXMsIFtvbGRWYWwsIG5ld1ZhbF0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHBhcmFtLnByb3RvdHlwZSA9IHByb3RvO1xuXG4gICAgLy8gU2V0IGJhc2UgZWxlbWVudCAoT3B0aW9uYWwpXG4gICAgaWYgKG9wdHMuZXh0ZW5kcykge1xuICAgICAgICBwYXJhbS5leHRlbmRzID0gb3B0cy5leHRlbmRzO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIGN1c3RvbSBlbGVtZW50XG4gICAgY29tcG9uZW50c1N0b3JlW29wdHMudGFnTmFtZV0gPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQob3B0cy50YWdOYW1lLCBwYXJhbSk7XG4gICAgcmV0dXJuIGNvbXBvbmVudHNTdG9yZVtvcHRzLnRhZ05hbWVdO1xufTtcblxuQ29tcG9uZW50LmV4dGVuZCA9IGZ1bmN0aW9uKGJhc2VDb21wb25lbnQsIG9wdHMpIHtcbiAgICB2YXIgQmFzZSA9IGNvbXBvbmVudHNTdG9yZVtiYXNlQ29tcG9uZW50XTtcbiAgICB2YXIgcGFyYW0gPSB7fTtcbiAgICAvLyBTZXQgUHJvdG90eXBlIG9mIGN1c3RvbSBlbGVtZW50XG4gICAgdmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xuXG4gICAgX2V4dGVuZFByb3RvdHlwZS5jYWxsKHByb3RvLCBvcHRzKTtcblxuICAgIHByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBCYXNlLnByb3RvdHlwZS5jcmVhdGVkQ2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG9wdHMub25DcmVhdGUpIHtcbiAgICAgICAgICAgIG9wdHMub25DcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwcm90by5hdHRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIEJhc2UucHJvdG90eXBlLmF0dGFjaGVkQ2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG9wdHMub25BdHRhY2gpIHtcbiAgICAgICAgICAgIG9wdHMub25BdHRhY2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICBfYWRkRXZlbnRMaXN0ZW5lcnMuY2FsbCh0aGlzLCBvcHRzLmV2ZW50cyk7XG4gICAgfTtcblxuICAgIHByb3RvLmRldGFjaGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgQmFzZS5wcm90b3R5cGUuZGV0YWNoZWRDYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBpZiAob3B0cy5vbkRldGFjaCkge1xuICAgICAgICAgICAgb3B0cy5vbkRldGFjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uKGF0dHJOYW1lLCBvbGRWYWwsIG5ld1ZhbCkge1xuICAgICAgICBCYXNlLnByb3RvdHlwZS5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG9wdHMub25BdHRyaWJ1dGVzQ2hhbmdlKSB7XG4gICAgICAgICAgICBvcHRzLm9uQXR0cmlidXRlc0NoYW5nZVthdHRyTmFtZV0uYXBwbHkodGhpcywgW29sZFZhbCwgbmV3VmFsXSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcGFyYW0ucHJvdG90eXBlID0gcHJvdG87XG5cbiAgICAvLyBSZWdpc3RlciBjdXN0b20gZWxlbWVudFxuICAgIHJldHVybiBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQob3B0cy50YWdOYW1lLCBwYXJhbSk7XG59O1xuXG5mdW5jdGlvbiBfYWRkRXZlbnRMaXN0ZW5lcnMoZXZlbnRzKSB7XG4gICAgZm9yICh2YXIgZXZ0IGluIGV2ZW50cykge1xuICAgICAgICB2YXIgcGFyYW0gPSBldnQuc3BsaXQoJyAnKTtcbiAgICAgICAgdmFyIGV2ZW50TmFtZSA9IHBhcmFtWzBdO1xuICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXMuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKHBhcmFtWzFdKTtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBldmVudHNbZXZ0XTtcbiAgICAgICAgdmFyIGZuID0gdGhpc1toYW5kbGVyXSA9IHRoaXNbaGFuZGxlcl0uYmluZCh0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZuKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIF9leHRlbmRQcm90b3R5cGUocHJvdG9zKSB7XG4gICAgZm9yICh2YXIgcHJvdG8gaW4gcHJvdG9zKSB7XG4gICAgICAgIHN3aXRjaCAocHJvdG8pIHtcbiAgICAgICAgICAgIGNhc2UgJ2V4ZW5kcyc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvbkNyZWF0ZSc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvbkRldGFjaCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvbkF0dHJpYnV0ZXNDaGFuZ2UnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb25BdHRhY2gnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndGFnTmFtZSc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdmcmFnbWVudCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzdHlsZSc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdldmVudHMnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzW3Byb3RvXSA9IHByb3Rvc1twcm90b107XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJ2YXIgbWl4aW5zID0ge307XG52YXIgdmFyaWFibGVzID0ge307XG5cbnZhciBTdHlsaXplciA9IGZ1bmN0aW9uKCkge307XG5cblN0eWxpemVyLnByb3RvdHlwZS5zdHJpbmdpZnkgPSBmdW5jdGlvbihzdHlsZSkge1xuICAgIHZhciByZXQgPSAnJztcblxuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHN0eWxlKSB7XG4gICAgICAgIHJldCArPSBzZWxlY3RvciArICd7JztcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBzdHlsZVtzZWxlY3Rvcl07XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gcHJvcGVydGllcykge1xuICAgICAgICAgICAgdmFyIHNldHRpbmcgPSBwcm9wZXJ0aWVzW3Byb3BdO1xuICAgICAgICAgICAgcmV0ICs9IHByb3AgKyAnOicgKyBzZXR0aW5nICsgJzsnO1xuICAgICAgICB9XG4gICAgICAgIHJldCA9IHJldC5zbGljZSgwLCByZXQubGVuZ3RoIC0gMSk7XG4gICAgICAgIHJldCArPSAnfSc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbn07XG5cblN0eWxpemVyLnByb3RvdHlwZS5jcmVhdGVTdHlsZVRhZyA9IGZ1bmN0aW9uKHN0eWxlKSB7XG4gICAgdmFyIHRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgc3R5bGUgPSB0aGlzLnN0cmluZ2lmeShzdHlsZSk7XG4gICAgdGFnLmlubmVyVGV4dCA9IHN0eWxlO1xuICAgIHJldHVybiB0YWc7XG59O1xuXG5TdHlsaXplci5wcm90b3R5cGUucmVnaXN0ZXJNaXhpbnMgPSBmdW5jdGlvbihrZXksIGZ1bmMpIHtcbiAgICBtaXhpbnNba2V5XSA9IGZ1bmM7XG59O1xuXG5TdHlsaXplci5wcm90b3R5cGUucmVnaXN0ZXJWYXJpYWJsZXMgPSBmdW5jdGlvbihrZXksIHZhbCkge1xuICAgIHZhcmlhYmxlc1trZXldID0gdmFsO1xufTtcblxuU3R5bGl6ZXIucHJvdG90eXBlLmdldFZhcmlhYmxlID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCF2YXJpYWJsZXNba2V5XSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdWYXJpYWJsZSAnICsga2V5ICsgJyBkb2VzIG5vdCBleGlzdC4nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdmFyaWFibGVzW2tleV07XG59O1xuXG5TdHlsaXplci5wcm90b3R5cGUudG9IZXggPSBmdW5jdGlvbihyZ2IpIHtcbiAgICByZ2IgPSByZ2IucmVwbGFjZSgnICcsICcnKS5zcGxpdCgnLCcpO1xuICAgIHJldHVybiBcIiNcIiArIGNvbXBvbmVudFRvSGV4KHJnYlswXSkgKyBjb21wb25lbnRUb0hleChyZ2JbMV0pICsgY29tcG9uZW50VG9IZXgocmdiWzJdKTtcblxuICAgIGZ1bmN0aW9uIGNvbXBvbmVudFRvSGV4KGMpIHtcbiAgICAgICAgdmFyIGhleCA9IGMudG9TdHJpbmcoMTYpO1xuICAgICAgICByZXR1cm4gaGV4Lmxlbmd0aCA9PSAxID8gXCIwXCIgKyBoZXggOiBoZXg7XG4gICAgfVxufTtcblxuU3R5bGl6ZXIucHJvdG90eXBlLnRvUkdCID0gZnVuY3Rpb24oaGV4KSB7XG4gICAgdmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xuICAgIHJldHVybiByZXN1bHQgPyAncmdiKCcgKyBbXG4gICAgICAgIHBhcnNlSW50KHJlc3VsdFsxXSwgMTYpLFxuICAgICAgICBwYXJzZUludChyZXN1bHRbMl0sIDE2KSxcbiAgICAgICAgcGFyc2VJbnQocmVzdWx0WzNdLCAxNilcbiAgICBdLmpvaW4oJywnKSArICcpJyA6IG51bGw7XG59O1xuXG5TdHlsaXplci5wcm90b3R5cGUudG9SR0JhID0gZnVuY3Rpb24oaGV4LCBvcGFjaXR5KSB7XG4gICAgdmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xuICAgIHJldHVybiByZXN1bHQgPyAncmdiYSgnICsgW1xuICAgICAgICBwYXJzZUludChyZXN1bHRbMV0sIDE2KSxcbiAgICAgICAgcGFyc2VJbnQocmVzdWx0WzJdLCAxNiksXG4gICAgICAgIHBhcnNlSW50KHJlc3VsdFszXSwgMTYpLFxuICAgICAgICBvcGFjaXR5XG4gICAgXS5qb2luKCcsJykgKyAnKScgOiBudWxsO1xufTtcblxuU3R5bGl6ZXIucHJvdG90eXBlLmdldE1peGlucyA9IGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICghbWl4aW5zW2tleV0pIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignTWl4aW4gJyArIGtleSArICcgZG9lcyBub3QgZXhpc3QuJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIG1peGluc1trZXldO1xufTtcbiIsInZhciBtb2R1bGVTdG9yZSA9IHt9O1xuXG52YXIgTW9kdWxlID0gZnVuY3Rpb24oKSB7fTtcblxuTW9kdWxlLnByb3RvdHlwZS5leHBvcnQgPSBmdW5jdGlvbihrZXksIGZ1bmMpIHtcbiAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2R1bGUgbmFtZSBpcyBub3QgYSBzdHJpbmcuJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kdWxlIGlzIG5vdCBhIGZ1bmN0aW9uLicpO1xuICAgIH1cbiAgICBtb2R1bGVTdG9yZVtrZXldID0gZnVuY3Rpb24oZG9uZSkge1xuICAgICAgICBkb25lKGZ1bmMoKSk7XG4gICAgfTtcbn07XG5cbk1vZHVsZS5wcm90b3R5cGUuaW1wb3J0ID0gZnVuY3Rpb24obW9kdWxlcykge1xuICAgIHZhciBsb2FkZWQgPSAwO1xuICAgIHZhciBjb3VudCAgPSBPYmplY3Qua2V5cyhtb2R1bGVzKTtcbiAgICB2YXIgdm93ID0gVm93KCk7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIHZhciB1cmw7XG5cbiAgICBfaW1wb3J0KGNvdW50LnBvcCgpLCB2b3cpO1xuXG4gICAgdm93LnByb21pc2UuYW5kID0ge307XG4gICAgdm93LnByb21pc2UuYW5kLmV4cG9ydCA9IGZ1bmN0aW9uKGtleSwgZnVuYykge1xuICAgICAgICBtb2R1bGVTdG9yZVtrZXldID0gZnVuY3Rpb24oZG9uZSkge1xuICAgICAgICAgICAgdm93LnByb21pc2VcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlU3RvcmVba2V5XSA9IGZ1bmMuYmluZCh0aGlzLCByZXQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIHJldCk7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgICAgIC5kb25lKGRvbmUpO1xuICAgICAgICB9O1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHZvdy5wcm9taXNlLmFuZC5pbXBvcnQgPSBmdW5jdGlvbihtb2R1bGVzKSB7XG4gICAgICAgIHJldHVybiB2b3cucHJvbWlzZS50aGVuKHRoaXMuaW1wb3J0LmJpbmQodGhpcywgbW9kdWxlcykpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHJldHVybiB2b3cucHJvbWlzZTtcblxuICAgIGZ1bmN0aW9uIF9pbXBvcnQoa2V5LCBwcm9taXNlKSB7XG4gICAgICAgIHZhciB1cmwgPSBtb2R1bGVzW2tleV07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZHVsZSBuYW1lIGlzIG5vdCBhIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgdXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVUkwgaXMgbm90IGEgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG1vZHVsZSA9IG1vZHVsZVN0b3JlW2tleV07XG4gICAgICAgIFxuICAgICAgICBpZiAoIW1vZHVsZSkge1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuXG4gICAgICAgICAgICBzY3JpcHQudHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCI7XG4gICAgICAgICAgICBzY3JpcHQuc3JjID0gdXJsO1xuICAgICAgICAgICAgc2NyaXB0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBkZWZlciA9IFZvdygpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgJyArIGtleSArICcuLi4nKTtcblxuICAgICAgICAgICAgICAgIGRlZmVyLnByb21pc2UudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldFtrZXldID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb3VudC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZShyZXQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2ltcG9ydChjb3VudC5wb3AoKSwgcHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHNjcmlwdC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBtb2R1bGVTdG9yZVtrZXldKGRlZmVyLnJlc29sdmUpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMsIGtleSk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZShtb2R1bGUoKSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwidmFyIERhdGEgPSBGYWN0b3J5LmV4dGVuZCh7XG4gICAgYWpheDogZnVuY3Rpb24ob3B0cyl7XG4gICAgICAgIGlmICghb3B0cy51cmwpIHRocm93IG5ldyBFcnJvcignVXJsIGlzIHJlcXVpcmVkLicpO1xuICAgICAgICBpZiAoIW9wdHMudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdSZXF1ZXN0IHR5cGUgaXMgcmVxdWlyZWQuJyk7XG5cbiAgICAgICAgb3B0cy5jb250ZW50VHlwZSA9IG9wdHMuY29udGVudFR5cGUgfHwgJ2FwcGxpY2F0aW9uL2pzb24nO1xuICAgICAgICBvcHRzLmVuY29kZSAgICAgID0gb3B0cy5lbmNvZGUgfHwgbnVsbDtcbiAgICAgICAgb3B0cy5wYXlsb2FkICAgICA9IG9wdHMucGF5bG9hZCB8fCBudWxsO1xuICAgICAgICBvcHRzLmluZGV4QnkgICAgID0gb3B0cy5pbmRleEJ5IHx8ICdpZCc7XG5cbiAgICAgICAgcmV0dXJuIGFqYXgob3B0cylcbiAgICAgICAgICAgICAgICAudGhlbihfcGFyc2UuYmluZCh0aGlzKSlcbiAgICAgICAgICAgICAgICAudGhlbihfdXBkYXRlU3RvcmUuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgZnVuY3Rpb24gX3VwZGF0ZVN0b3JlKHJzcCkge1xuICAgICAgICAgICAgaWYgKG9wdHMudHlwZS50b1VwcGVyQ2FzZSgpID09PSAnREVMRVRFJykge1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJzcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcnNwLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bnNldChkW29wdHMuaW5kZXhCeV0sIGQpO1xuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJzcCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnNldChyc3Bbb3B0cy5pbmRleEJ5XSwgcnNwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJzcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcnNwLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoZFtvcHRzLmluZGV4QnldLCBkKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiByc3AgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KHJzcFtvcHRzLmluZGV4QnldLCByc3ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByc3A7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBfcGFyc2UocnNwKSB7XG4gICAgICAgICAgICBpZiAob3B0cy5wYXJzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHRzLnBhcnNlKHJzcCk7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2UocnNwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBwYXJzZTogZnVuY3Rpb24ocnNwKSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJzcCk7XG4gICAgfVxufSk7XG5cbnZhciBkYXRhc3RvcmUgPSB7fTtcbnZhciBSZXNvdXJjZSA9IGZ1bmN0aW9uKCkge307XG5cblJlc291cmNlLnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZiAoZGF0YXN0b3JlW25hbWVdKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzb3VyY2UgJyArIG5hbWUgKyAnIGFscmVhZHkgZXhpc3QuJyk7XG4gICAgfVxuXG4gICAgZGF0YXN0b3JlW25hbWVdID0gbmV3IERhdGEoKTtcbiAgICByZXR1cm4gZGF0YXN0b3JlW25hbWVdO1xufTtcblxuUmVzb3VyY2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gZGF0YXN0b3JlW25hbWVdID8gZGF0YXN0b3JlW25hbWVdIDogdGhpcy5yZWdpc3RlcihuYW1lKTtcbn07XG4iLCJ2YXIgUmVuZGVyZXIgPSBmdW5jdGlvbigpe307XG5cblJlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVUZW1wbGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVGVtcGxhdGUoKTtcbn07XG5cbnZhciBUZW1wbGF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fY3VycmVudFN0YXRlID0gW107XG4gICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICB0aGlzLl9jb25kaXRpb25hbCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9sb29wID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3N0YXJ0ID0gdW5kZWZpbmVkO1xuXG59O1xuXG4vKipcbiAqIENyZWF0ZSBET00gbm9kZVxuICogQHBhcmFtICB7c3RyaW5nfSB0YWdOYW1lIEVsZW1lbnQgbmFtZVxuICogQHJldHVybiB7aW5zdGFuY2V9ICAgICAgIHRoaXNcbiAqL1xuVGVtcGxhdGUucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKHRhZ05hbWUpe1xuICAgIHRhZ05hbWUgPSBwYXJzZVRhZyh0YWdOYW1lKTtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lWzBdKTtcbiAgICAgICAgaWYgKHRhZ05hbWVbMV0gPT09ICcuJykge1xuICAgICAgICAgICAgZWwuY2xhc3NOYW1lID0gdGFnTmFtZVsyXTtcbiAgICAgICAgfSBlbHNlIGlmICh0YWdOYW1lWzFdID09PSAnIycpIHtcbiAgICAgICAgICAgIGVsLmlkID0gdGFnTmFtZVsyXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jdXJyZW50U3RhdGUucHVzaChlbCk7XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAnb3BlbicsXG4gICAgICAgIGZuOiBmblxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVGVtcGxhdGUucHJvdG90eXBlLmFkZENsYXNzID0gZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24oZCkge1xuICAgICAgICB2YXIgZWwgPSBncmFiTGFzdC5jYWxsKHRoaXMpO1xuICAgICAgICBjbGFzc05hbWUgPSBldmFsdWF0ZShkLCBjbGFzc05hbWUpO1xuICAgICAgICB2YXIgc2VwYXJhdG9yID0gZWwuY2xhc3NOYW1lLmxlbmd0aCA+IDAgPyAnICcgOiAnJztcbiAgICAgICAgaWYgKCFoYXNDbGFzcyhlbCxjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICBlbC5jbGFzc05hbWUgKz0gc2VwYXJhdG9yICsgY2xhc3NOYW1lO1xuICAgICAgICB9XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAnYWRkQ2xhc3MnLFxuICAgICAgICBmbjogZm5cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS50ZXh0ID0gZnVuY3Rpb24oY29udGVudCkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGVsID0gZ3JhYkxhc3QuY2FsbCh0aGlzKTtcbiAgICAgICAgZWwudGV4dENvbnRlbnQgPSBldmFsdWF0ZShkLCBjb250ZW50KTtcbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5fcXVldWUucHVzaCh7XG4gICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUuYXR0ciA9IGZ1bmN0aW9uKGF0dHIsIHZhbCkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGVsID0gZ3JhYkxhc3QuY2FsbCh0aGlzKTtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKGV2YWx1YXRlKGQsIGF0dHIpLCBldmFsdWF0ZShkLCB2YWwpKTtcbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5fcXVldWUucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhdHRyJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUuc3R5bGUgPSBmdW5jdGlvbihhdHRyLCB2YWwpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBlbCA9IGdyYWJMYXN0LmNhbGwodGhpcyk7XG4gICAgICAgIGVsLnN0eWxlW2V2YWx1YXRlKGQsIGF0dHIpXSA9IGV2YWx1YXRlKGQsIHZhbCk7XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3R5bGUnLFxuICAgICAgICBmbjogZm5cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS5yZW1vdmVDbGFzcyA9IGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGVsID0gZ3JhYkxhc3QuY2FsbCh0aGlzKTtcbiAgICAgICAgY2xhc3NOYW1lID0gZXZhbHVhdGUoZCwgY2xhc3NOYW1lKTtcbiAgICAgICAgaWYgKGhhc0NsYXNzKGVsLGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciByZWcgPSBuZXcgUmVnRXhwKCcoXFxcXHN8XiknK2NsYXNzTmFtZSsnKFxcXFxzfCQpJyk7XG4gICAgICAgICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShyZWcsJyAnKTtcbiAgICAgICAgfVxuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3JlbW92ZUNsYXNzJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24oZCkge1xuICAgICAgICB2YXIgZWwgPSB0aGlzLl9jdXJyZW50U3RhdGUucG9wKCk7XG4gICAgICAgIGlmICh0aGlzLl9jdXJyZW50U3RhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzRnJhZ21lbnQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IGdyYWJMYXN0LmNhbGwodGhpcyk7XG4gICAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICB9XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAnY2xvc2UnLFxuICAgICAgICBmbjogZm5cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS5hcHBlbmRMYXN0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgIHZhciBlbCA9IHRoaXMuX2N1cnJlbnRTdGF0ZS5wb3AoKTtcbiAgICAgIHRoaXMucHJldmlvdXNGcmFnbWVudC5hcHBlbmRDaGlsZChlbCk7XG4gIH0uYmluZCh0aGlzKTtcbiAgdGhpcy5fcXVldWUucHVzaCh7XG4gICAgICB0eXBlOiAnZW5kJyxcbiAgICAgIGZuOiBmblxuICB9KTtcbiAgcmV0dXJuIHRoaXM7ICBcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS5pZiA9IGZ1bmN0aW9uKGZ1bmNPcktleSkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdGhpcy5fc3RhdGUgPSAnY29uZGl0aW9uYWwnO1xuICAgICAgICBmdW5jT3JLZXkgPSBldmFsdWF0ZShkLCBmdW5jT3JLZXkpO1xuICAgICAgICB0aGlzLl9jb25kaXRpb25hbCA9ICEhZnVuY09yS2V5O1xuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2lmJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUuZWxzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdGhpcy5fY29uZGl0aW9uYWwgPSAhdGhpcy5fY29uZGl0aW9uYWw7XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAnZWxzZScsXG4gICAgICAgIGZuOiBmblxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVGVtcGxhdGUucHJvdG90eXBlLmVhY2ggPSBmdW5jdGlvbihmdW5jT3JLZXkpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgID0gZXZhbHVhdGUoZCwgZnVuY09yS2V5KTtcbiAgICAgICAgdGhpcy5fc3RhdGUgPSAnbG9vcCc7XG4gICAgICAgIHRoaXMuX3N0YXJ0ID0gaTtcbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5fcXVldWUucHVzaCh7XG4gICAgICAgIHR5cGU6ICdlYWNoJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgdGhpcy5fY29uZGl0aW9uYWwgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3N0YXRlICAgICAgID0gdW5kZWZpbmVkO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RvbmUnLFxuICAgICAgICBmbjogZm5cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgdGhpcy5wcmV2aW91c0ZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHRoaXMuX3F1ZXVlLmZvckVhY2goZnVuY3Rpb24ocSwgaSkge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuX3N0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdjb25kaXRpb25hbCc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NvbmRpdGlvbmFsIHx8IHEudHlwZSA9PT0gJ2Vsc2UnIHx8IHEudHlwZSA9PT0gJ2RvbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZm4oZGF0YSwgaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbG9vcCc6XG4gICAgICAgICAgICAgICAgaWYgKHEudHlwZSA9PT0gJ2RvbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvb3AuZm9yRWFjaChmdW5jdGlvbihsLCBqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBzdGFydCA9IHRoaXMuX3N0YXJ0ICsgMTsgc3RhcnQgPCBpOyBzdGFydCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvb3BGbiA9IHRoaXMuX3F1ZXVlW3N0YXJ0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wRm4uZm4obCwgaik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIHEuZm4oZGF0YSwgaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBxLmZuKGRhdGEsIGkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHJldHVybiB0aGlzLnByZXZpb3VzRnJhZ21lbnQ7XG59O1xuXG5mdW5jdGlvbiBncmFiTGFzdCgpIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudFN0YXRlW3RoaXMuX2N1cnJlbnRTdGF0ZS5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkge1xuICByZXR1cm4gISFlbC5jbGFzc05hbWUubWF0Y2gobmV3IFJlZ0V4cCgnKFxcXFxzfF4pJytjbGFzc05hbWUrJyhcXFxcc3wkKScpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUYWcodGFnKSB7XG4gICAgdGFnID0gdGFnLnJlcGxhY2UoL1suI10vLCBmdW5jdGlvbihkKSB7IHJldHVybiAnLCcgKyBkICsgJywnO30pXG4gICAgICAgICAgICAgLnNwbGl0KCcsJyk7XG4gICAgcmV0dXJuIHRhZztcbn1cblxuZnVuY3Rpb24gZXZhbHVhdGUoZGF0YSwgZnVuY09yU3RyaW5nKSB7XG4gICAgc3dpdGNoICh0eXBlb2YgZnVuY09yU3RyaW5nKSB7XG4gICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgIHJldHVybiBmdW5jT3JTdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBmdW5jT3JTdHJpbmc7XG4gICAgfVxufVxuIiwidmFyIGdFdmVudEJ1cyA9IG5ldyBFdmVudEJ1cygpOztcblxudmFyIFRyaW8gPSB7XG4gICAgRmFjdG9yeTogRmFjdG9yeSxcbiAgICBTZXJ2aWNlOiBTZXJ2aWNlLFxuICAgIENvbXBvbmVudDogQ29tcG9uZW50LFxuICAgIFZvdzogVm93LFxuICAgIFN0eWxpemVyOiBuZXcgU3R5bGl6ZXIoKSxcbiAgICBSZW5kZXJlcjogbmV3IFJlbmRlcmVyKCksXG4gICAgTW9kdWxlOiBuZXcgTW9kdWxlKCksXG4gICAgUmVzb3VyY2U6IG5ldyBSZXNvdXJjZSgpLFxuICAgIFZFUlNJT046ICcwLjEuMidcbn1cblxuVHJpby5yZWdpc3Rlckdsb2JhbEV2ZW50QnVzID0gZnVuY3Rpb24oaWQpIHtcbiAgICByZXR1cm4gZ0V2ZW50QnVzLnJlZ2lzdGVyKGlkKTtcbn07XG5cbmlmIChtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFRyaW87XG59IGVsc2Uge1xuICAgIHdpbmRvdy5UcmlvID0gVHJpbztcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==