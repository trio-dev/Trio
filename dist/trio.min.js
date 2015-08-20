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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFqYXguanMiLCJkZWZhdWx0cy5qcyIsImV4dGVuZC5qcyIsImlkR2VuZXJhdG9yLmpzIiwicGFyYW0uanMiLCJ2b3cuanMiLCJldmVudEJ1cy5qcyIsImZhY3RvcnkuanMiLCJzZXJ2aWNlLmpzIiwiY29tcG9uZW50LmpzIiwic3R5bGl6ZXIuanMiLCJtb2R1bGUuanMiLCJyZXNvdXJjZS5qcyIsInJlbmRlcmVyLmpzIiwiaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoidHJpby5qcyIsInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIGFqYXgob3B0cykge1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB2YXIgdm93ID0gVm93KCk7XG5cbiAgICBpZiAob3B0cy5lbmNvZGUpIHtcbiAgICAgICAgb3B0cy51cmwgKz0gZW5jb2RlVVJJKG9wdHMuZW5jb2RlKG9wdHMucGF5bG9hZCkpO1xuICAgIH1cblxuICAgIHhoci5vcGVuKG9wdHMudHlwZS50b1VwcGVyQ2FzZSgpLCBvcHRzLnVybCk7XG4gICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsIG9wdHMuY29udGVudFR5cGUpO1xuXG4gICAgZm9yICh2YXIgaGVhZGVyIGluIG9wdHMuaGVhZGVycykge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIG9wdHMuaGVhZGVyc1toZWFkZXJdKTtcbiAgICB9XG5cbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDw9IDI5OSkge1xuICAgICAgICAgICAgdm93LnJlc29sdmUoeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2b3cucmVqZWN0KHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGlmIChvcHRzLmVuY29kZSkge1xuICAgICAgICB4aHIuc2VuZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KG9wdHMucGF5bG9hZCkpO1xuICAgIH1cblxuICAgIHJldHVybiB2b3cucHJvbWlzZTtcbn0iLCJmdW5jdGlvbiBkZWZhdWx0cyhvYmosIGRlZikge1xuICAgIGRlZiA9IGRlZiB8fCB7fTtcbiAgICBcbiAgICBmb3IgKHZhciBrZXkgaW4gZGVmKSB7XG4gICAgICAgIGlmICghb2JqW2tleV0pIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gZGVmW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufSIsImZ1bmN0aW9uIGV4dGVuZChtZXRob2RzKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX2NvbnN0cnVjdG9yO1xuXG4gICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdGF0aWNBdHRyID0ge307XG4gICAgdmFyIGNoaWxkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdGF0aWNBdHRyKSB7XG4gICAgICAgICAgICB0aGlzW2tleV0gPSBzdGF0aWNBdHRyW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgZXh0ZW5kZWQgPSB7fTtcblxuICAgIGZvciAodmFyIHByb3AgaW4gcGFyZW50LnByb3RvdHlwZSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmVudC5wcm90b3R5cGUsIHByb3ApKSB7XG4gICAgICAgICAgICBleHRlbmRlZFtwcm9wXSA9IHBhcmVudC5wcm90b3R5cGVbcHJvcF07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBtZXQgaW4gbWV0aG9kcykge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1ldGhvZHMsIG1ldCkpIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBtZXRob2RzW21ldF07XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1ldGhvZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGV4dGVuZGVkW21ldF0gPSBtZXRob2RzW21ldF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRpY0F0dHJbbWV0XSA9IG1ldGhvZHNbbWV0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNoaWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoZXh0ZW5kZWQpO1xuXG4gICAgcmV0dXJuIGNoaWxkO1xufVxuIiwiZnVuY3Rpb24gaWRHZW5lcmF0b3Ioc3RyKSB7XG4gICAgdmFyIGNvdW50ID0gMTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlkID0gc3RyICsgY291bnQ7XG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9O1xufVxuIiwiZnVuY3Rpb24gcGFyYW0ob2JqZWN0KSB7XG4gICAgdmFyIGVuY29kZWRTdHJpbmcgPSAnJztcbiAgICBmb3IgKHZhciBwcm9wIGluIG9iamVjdCkge1xuICAgICAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBpZiAoZW5jb2RlZFN0cmluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZW5jb2RlZFN0cmluZyArPSAnJic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbmNvZGVkU3RyaW5nICs9IGVuY29kZVVSSShwcm9wICsgJz0nICsgb2JqZWN0W3Byb3BdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZW5jb2RlZFN0cmluZztcbn1cbiIsIi8qanNoaW50IGVzNTogdHJ1ZSAqL1xudmFyIFBFTkRJTkcgICA9IHt9LFxuICAgIFJFU09MVkVEICA9IHt9LFxuICAgIFJFSkVDVEVEICA9IHt9LFxuICAgIEZVTEZJTExFRCA9IHt9O1xuXG52YXIgVm93ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZvdyA9IHt9O1xuICAgIHZhciBfcHJvbWlzZSA9IFByb21pc2VPYmooKTtcblxuICAgIHZvdy5yZXNvbHZlID0gX3Byb21pc2UucmVzb2x2ZTtcbiAgICB2b3cucmVqZWN0ICA9IF9wcm9taXNlLnJlamVjdDtcbiAgICB2b3cucHJvbWlzZSA9IHtcbiAgICAgICAgdGhlbjogX3Byb21pc2UudGhlbixcbiAgICAgICAgY2F0Y2g6IF9wcm9taXNlLmNhdGNoLFxuICAgICAgICBkb25lOiBfcHJvbWlzZS5kb25lXG4gICAgfTtcblxuICAgIHJldHVybiB2b3c7XG5cbiAgICBmdW5jdGlvbiBQcm9taXNlT2JqKCkge1xuICAgICAgICB2YXIgc3RhdGUgPSBQRU5ESU5HO1xuICAgICAgICB2YXIgdmFsdWUsIG9uUmVzb2x2ZWQsIG9uUmVqZWN0ZWQsIG9uRnVsbGZpbGxlZCwgcmV0dXJuUHJvbWlzZTtcblxuICAgICAgICB2YXIgcmV0ID0ge1xuXG4gICAgICAgICAgICByZXNvbHZlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBSRVNPTFZFRDtcblxuICAgICAgICAgICAgICAgIGlmIChvblJlc29sdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVJlc29sdmUob25SZXNvbHZlZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbkZ1bGxmaWxsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlRG9uZShvbkZ1bGxmaWxsZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlamVjdDogZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gZXJyO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gUkVKRUNURUQ7XG5cbiAgICAgICAgICAgICAgICBpZiAob25SZWplY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVSZWplY3Qob25SZWplY3RlZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbkZ1bGxmaWxsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlRG9uZShvbkZ1bGxmaWxsZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHRoZW46IGZ1bmN0aW9uIChzdWNjZXNzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm5Qcm9taXNlID0gUHJvbWlzZU9iaigpO1xuICAgICAgICAgICAgICAgIGhhbmRsZVJlc29sdmUoc3VjY2Vzc0NhbGxiYWNrKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHRoZW46IHJldHVyblByb21pc2UudGhlbixcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2g6IHJldHVyblByb21pc2UuY2F0Y2gsXG4gICAgICAgICAgICAgICAgICAgIGRvbmU6IHJldHVyblByb21pc2UuZG9uZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBjYXRjaDogZnVuY3Rpb24gKGZhaWxDYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVyblByb21pc2UgPSBQcm9taXNlT2JqKCk7XG4gICAgICAgICAgICAgICAgaGFuZGxlUmVqZWN0KGZhaWxDYWxsYmFjayk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0aGVuOiByZXR1cm5Qcm9taXNlLnRoZW4sXG4gICAgICAgICAgICAgICAgICAgIGNhdGNoOiByZXR1cm5Qcm9taXNlLmNhdGNoLFxuICAgICAgICAgICAgICAgICAgICBkb25lOiByZXR1cm5Qcm9taXNlLmRvbmVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZG9uZTogZnVuY3Rpb24gKGZpbmFsbHlDYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGhhbmRsZURvbmUoZmluYWxseUNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gcmV0O1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZURvbmUoZm4pIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gUEVORElORykge1xuICAgICAgICAgICAgICAgIG9uRnVsbGZpbGxlZCA9IGZuIHx8ICdkb25lJztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gUkVTT0xWRUQgJiYgdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBGVUxGSUxMRUQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmNhbGwodGhpcywgdmFsdWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBGVUxGSUxMRUQ7XG4gICAgICAgICAgICAgICAgdGhyb3cgdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVSZXNvbHZlKGZuKSB7XG4gICAgICAgICAgICB2YXIgZXJyb3I7XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgICAgICAgICAgICBvblJlc29sdmVkID0gZm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gUkVTT0xWRUQpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUudGhlbihyZXQucmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGZuLmNhbGwodGhpcywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXR1cm5Qcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblByb21pc2UucmVzb2x2ZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuUHJvbWlzZS5yZWplY3QodmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZVJlamVjdChmbikge1xuICAgICAgICAgICAgdmFyIGVycm9yO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSBQRU5ESU5HKSB7XG4gICAgICAgICAgICAgICAgb25SZWplY3RlZCA9IGZuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBmbi5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBlcnI7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmV0dXJuUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5Qcm9taXNlLnJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblByb21pc2UucmVqZWN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gUkVTT0xWRUQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmV0dXJuUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm5Qcm9taXNlLnJlc29sdmUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJ2YXIgRXZlbnRCdXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdGhpcy5yZWdpc3RlciA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiAoZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGV2dCA9IHt9O1xuICAgICAgICAgICAgZXZ0LnN1YnNjcmliZSA9IGZ1bmN0aW9uKGV2ZW50LCBmdW5jKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5fc3Vic2NyaWJlKGV2ZW50LCBmdW5jLCBpZCwgZXZlbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBldnQucHVibGlzaCA9IGZ1bmN0aW9uKGV2ZW50LCBjdHgsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0Ll9wdWJsaXNoKGV2ZW50LCBjdHgsIGFyZ3MsIGV2ZW50cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZXZ0LnVuc3Vic2NyaWJlID0gZnVuY3Rpb24oZXZlbnQsIGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0Ll91bnN1YnNjcmliZShldmVudCwgZnVuYywgaWQsIGV2ZW50cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZXZ0LnVuc3Vic2NyaWJlQWxsID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0Ll91bnN1YnNjcmliZUFsbChldmVudCwgaWQsIGV2ZW50cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGV2dDtcbiAgICAgICAgfSkodGhpcyk7XG4gICAgfTtcbn07XG5cbkV2ZW50QnVzLnByb3RvdHlwZS5fc3Vic2NyaWJlID0gZnVuY3Rpb24oZXZlbnQsIGZ1bmMsIGlkLCBldmVudHMpIHtcbiAgICBpZiAoIWV2ZW50c1tldmVudF0pIHtcbiAgICAgICAgZXZlbnRzW2V2ZW50XSA9IHt9O1xuICAgIH1cblxuICAgIGlmICghZXZlbnRzW2V2ZW50XVtpZF0pIHtcbiAgICAgICAgZXZlbnRzW2V2ZW50XVtpZF0gPSBbXTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGZ1bmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBIGNhbGxiYWNrIGZ1bmN0aW9uIG11c3QgYmUgcGFzc2VkIGluIHRvIHN1YnNjcmliZScpO1xuICAgIH1cbiAgICBcbiAgICBldmVudHNbZXZlbnRdW2lkXS5wdXNoKGZ1bmMpO1xufTtcblxuRXZlbnRCdXMucHJvdG90eXBlLl9wdWJsaXNoID0gZnVuY3Rpb24oZXZlbnQsIGN0eCwgYXJncywgZXZlbnRzKSB7XG4gICAgY3R4ID0gY3R4IHx8IG51bGw7XG4gICAgYXJncyA9IGFyZ3MgfHwgbnVsbDtcblxuICAgIHZhciBldmVudEJ1Y2tldCA9IGV2ZW50c1tldmVudF07XG5cbiAgICBpZiAoZXZlbnRCdWNrZXQpIHtcbiAgICAgICAgZm9yICh2YXIgYnVja2V0IGluIGV2ZW50QnVja2V0KSB7XG4gICAgICAgICAgICB2YXIgY2JRdWV1ZSA9IGV2ZW50QnVja2V0W2J1Y2tldF07XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjYlF1ZXVlKSkge1xuICAgICAgICAgICAgICAgIGNiUXVldWUuZm9yRWFjaChtYWtlRWFjaEhhbmRsZXIuY2FsbCh0aGlzLCBjdHgsIGFyZ3MpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VFYWNoSGFuZGxlcihjdHgsIGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGNiKSB7XG4gICAgICAgICAgICBjYi5jYWxsKHRoaXMsIGN0eCwgYXJncyk7XG4gICAgICAgIH07XG4gICAgfVxufTtcblxuRXZlbnRCdXMucHJvdG90eXBlLl91bnN1YnNjcmliZSA9IGZ1bmN0aW9uKGV2ZW50LCBmdW5jLCBpZCwgZXZlbnRzKSB7XG4gICAgdmFyIGJ1Y2tldCA9IGV2ZW50c1tldmVudF07XG5cbiAgICBpZiAoYnVja2V0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IGJ1Y2tldFtpZF07XG5cbiAgICAgICAgcXVldWUuZm9yRWFjaChmdW5jdGlvbihmbiwgaSkge1xuICAgICAgICAgICAgaWYoZm4gPT09IGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBxdWV1ZS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgIH1cbn07XG5cbkV2ZW50QnVzLnByb3RvdHlwZS5fdW5zdWJzY3JpYmVBbGwgPSBmdW5jdGlvbihldmVudCwgaWQsIGV2ZW50cykge1xuICAgIGlmIChldmVudCkge1xuICAgICAgICB1bnN1YnNyaWJlT25lKGV2ZW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH0gXG5cbiAgICBmb3IgKHZhciBldnQgaW4gZXZlbnRzKSB7XG4gICAgICAgIHVuc3Vic3JpYmVPbmUoZXZ0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnN1YnNyaWJlT25lKGV2ZW50KSB7XG4gICAgICAgIHZhciBidWNrZXQgPSBldmVudHNbZXZlbnRdO1xuXG4gICAgICAgIGlmIChidWNrZXQgJiYgYnVja2V0W2lkXSkge1xuICAgICAgICAgICAgZGVsZXRlIGJ1Y2tldFtpZF07XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwidmFyIEZhY3RvcnkgPSB7fTtcbnZhciBmYWN0b3J5SWRHZW5lcmF0b3IgPSBpZEdlbmVyYXRvcignZmFjdG9yeScpO1xuXG5GYWN0b3J5Ll9jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICB0aGlzLl9pbml0aWFsaXplKG9wdHMpO1xufTtcblxuRmFjdG9yeS5fY29uc3RydWN0b3IucHJvdG90eXBlLl9pbml0aWFsaXplID0gZnVuY3Rpb24ob3B0cykge1xuICAgIHZhciBhdHRyaWJ1dGVzID0ge307XG5cbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAgIHRoaXMudXVpZCA9IGZhY3RvcnlJZEdlbmVyYXRvcigpO1xuICAgIHRoaXMucmVzb3VyY2VzID0ge307XG4gICAgdGhpcy5ldmVudEJ1cyA9IG9wdHMuZXZlbnRCdXMgfHwgbmV3IEV2ZW50QnVzKCk7XG4gICAgdGhpcy5ldmVudEJ1cyA9IHRoaXMuZXZlbnRCdXMucmVnaXN0ZXIodGhpcy51dWlkKTtcblxuICAgIHRoaXMuc2V0ID0gZnVuY3Rpb24oa2V5LCB2YWwpIHtcbiAgICAgICAgdGhpcy5fc2V0KGtleSwgdmFsLCBhdHRyaWJ1dGVzKTtcbiAgICB9O1xuXG4gICAgdGhpcy51bnNldCA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB0aGlzLl91bnNldChrZXksIGF0dHJpYnV0ZXMpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0KGtleSwgYXR0cmlidXRlcyk7XG4gICAgfTtcblxuICAgIHRoaXMuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYXR0cmlidXRlcykpO1xuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIHRoaXMuaW5pdGlhbGl6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldChkZWZhdWx0cyhvcHRzLCB0aGlzLmRlZmF1bHRzKSk7XG4gICAgdGhpcy5ldmVudEJ1cy5wdWJsaXNoKCdpbml0aWFsaXplJywgdGhpcywgb3B0cyk7XG59O1xuXG5GYWN0b3J5Ll9jb25zdHJ1Y3Rvci5wcm90b3R5cGUuX3NldCA9IGZ1bmN0aW9uKGtleSwgdmFsLCBhdHRyaWJ1dGVzKSB7XG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBrZXkpIHtcbiAgICAgICAgICAgIHRoaXMuX3NldChrLCBrZXlba10sIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGF0dHJpYnV0ZXNba2V5XSA9IHZhbDtcbiAgICAgICAgdmFyIHJldCA9IHt9O1xuICAgICAgICByZXRba2V5XSA9IHZhbDtcbiAgICAgICAgdGhpcy5ldmVudEJ1cy5wdWJsaXNoKCdjaGFuZ2UnLCB0aGlzLCByZXQpO1xuICAgICAgICB0aGlzLmV2ZW50QnVzLnB1Ymxpc2goJ2NoYW5nZTonICsga2V5LCB0aGlzLCB2YWwpO1xuICAgIH1cbn07XG5cbkZhY3RvcnkuX2NvbnN0cnVjdG9yLnByb3RvdHlwZS5fZ2V0ID0gZnVuY3Rpb24oa2V5LCBhdHRyaWJ1dGVzKSB7XG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBhdHRyaWJ1dGVzW2tleV07XG4gICAgfSAgZWxzZSBpZiAodHlwZW9mIGtleSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZXM7XG4gICAgfVxufTtcblxuRmFjdG9yeS5fY29uc3RydWN0b3IucHJvdG90eXBlLl91bnNldCA9IGZ1bmN0aW9uKGtleSwgYXR0cmlidXRlcykge1xuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgcmV0ID0ge307XG4gICAgICAgIHJldFtrZXldID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICBkZWxldGUgYXR0cmlidXRlc1trZXldO1xuICAgICAgICB0aGlzLmV2ZW50QnVzLnB1Ymxpc2goJ2RlbGV0ZScsIHRoaXMsIHJldCk7XG4gICAgICAgIHRoaXMuZXZlbnRCdXMucHVibGlzaCgnZGVsZXRlOicgKyBrZXksIHRoaXMsIHJldFtrZXldKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gYXR0cmlidXRlcykge1xuICAgICAgICAgICAgdGhpcy5fdW5zZXQoaywgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5GYWN0b3J5Ll9jb25zdHJ1Y3Rvci5wcm90b3R5cGUuc3luYyA9IGZ1bmN0aW9uKHJlc291cmNlLCBpZCkge1xuICAgIHRoaXMucmVzb3VyY2VzW3Jlc291cmNlXSA9IHJlc291cmNlO1xuXG4gICAgcmVzb3VyY2UuZXZlbnRCdXMuc3Vic2NyaWJlKCdjaGFuZ2U6JyArIGlkLCBmdW5jdGlvbihjdHgsIGF0dHJzKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gYXR0cnMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KGssIGF0dHJzW2tdKTtcbiAgICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICByZXNvdXJjZS5ldmVudEJ1cy5zdWJzY3JpYmUoJ2RlbGV0ZTonICsgaWQsIGZ1bmN0aW9uKGN0eCwgYXR0cnMpIHtcbiAgICAgICAgdGhpcy51bnNldCgpO1xuICAgIH0uYmluZCh0aGlzKSk7XG59O1xuXG5GYWN0b3J5LmV4dGVuZCA9IGV4dGVuZDtcbiIsInZhciBzZXJ2aWNlSWRHZW5lcmF0b3IgPSBpZEdlbmVyYXRvcignc2VydmljZScpO1xuXG52YXIgU2VydmljZSA9IHt9O1xuXG5TZXJ2aWNlLl9jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICB0aGlzLl9pbml0aWFsaXplKG9wdHMpO1xufTtcblxuU2VydmljZS5fY29uc3RydWN0b3IucHJvdG90eXBlLl9pbml0aWFsaXplID0gZnVuY3Rpb24ob3B0cykge1xuICAgIHRoaXMudXVpZCA9IHNlcnZpY2VJZEdlbmVyYXRvcigpO1xuXG4gICAgaWYgKHR5cGVvZiB0aGlzLmluaXRpYWxpemUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufTtcblxuU2VydmljZS5fY29uc3RydWN0b3IucHJvdG90eXBlLnN1YnNjcmliZUFsbCA9IGZ1bmN0aW9uKHRhcmdldCwgZXZlbnRzKSB7XG4gICAgZm9yICh2YXIgZXZ0IGluIGV2ZW50cykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IGV2ZW50c1tldnRdO1xuICAgICAgICB2YXIgZm4gPSB0aGlzW2hhbmRsZXJdID0gdGhpc1toYW5kbGVyXS5iaW5kKHRoaXMpO1xuICAgICAgICB0YXJnZXQuZXZlbnRCdXMuc3Vic2NyaWJlKGV2dCwgZm4pO1xuICAgIH1cbn07XG5cblNlcnZpY2UuZXh0ZW5kID0gZXh0ZW5kO1xuIiwidmFyIGNvbXBvbmVudElkR2VuZXJhdG9yID0gaWRHZW5lcmF0b3IoJ2NvbXBvbmVudCcpO1xudmFyIGNvbXBvbmVudHNTdG9yZSA9IHt9O1xudmFyIENvbXBvbmVudCA9IHt9O1xuXG5Db21wb25lbnQucmVnaXN0ZXIgPSBmdW5jdGlvbihvcHRzKSB7XG4gICAgaWYgKGNvbXBvbmVudHNTdG9yZVtvcHRzLnRhZ05hbWVdKSB7XG4gICAgICAgIHJldHVybiBjb21wb25lbnRzU3RvcmVbb3B0cy50YWdOYW1lXTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW0gPSB7fTtcblxuICAgIC8vIFNldCBQcm90b3R5cGUgb2YgY3VzdG9tIGVsZW1lbnRcbiAgICB2YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG5cbiAgICBfZXh0ZW5kUHJvdG90eXBlLmNhbGwocHJvdG8sIG9wdHMpO1xuXG4gICAgcHJvdG8uY3JlYXRlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzaGFkb3cgPSB0aGlzLmNyZWF0ZVNoYWRvd1Jvb3QoKTtcbiAgICAgICAgc2hhZG93LmFwcGVuZENoaWxkKG9wdHMuZnJhZ21lbnQuY2xvbmVOb2RlKHRydWUpKTtcblxuICAgICAgICB0aGlzLnV1aWQgPSBjb21wb25lbnRJZEdlbmVyYXRvcigpO1xuXG4gICAgICAgIGlmIChvcHRzLnN0eWxlKSB7XG4gICAgICAgICAgICBzaGFkb3cuYXBwZW5kQ2hpbGQob3B0cy5zdHlsZS5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRzLm9uQ3JlYXRlKSB7XG4gICAgICAgICAgICBvcHRzLm9uQ3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcHJvdG8uYXR0YWNoZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAob3B0cy5vbkF0dGFjaCkge1xuICAgICAgICAgICAgb3B0cy5vbkF0dGFjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIF9hZGRFdmVudExpc3RlbmVycy5jYWxsKHRoaXMsIG9wdHMuZXZlbnRzKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uZGV0YWNoZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAob3B0cy5vbkRldGFjaCkge1xuICAgICAgICAgICAgb3B0cy5vbkRldGFjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uKGF0dHJOYW1lLCBvbGRWYWwsIG5ld1ZhbCkge1xuICAgICAgICBpZiAob3B0cy5vbkF0dHJpYnV0ZXNDaGFuZ2UpIHtcbiAgICAgICAgICAgIG9wdHMub25BdHRyaWJ1dGVzQ2hhbmdlW2F0dHJOYW1lXS5hcHBseSh0aGlzLCBbb2xkVmFsLCBuZXdWYWxdKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwYXJhbS5wcm90b3R5cGUgPSBwcm90bztcblxuICAgIC8vIFNldCBiYXNlIGVsZW1lbnQgKE9wdGlvbmFsKVxuICAgIGlmIChvcHRzLmV4dGVuZHMpIHtcbiAgICAgICAgcGFyYW0uZXh0ZW5kcyA9IG9wdHMuZXh0ZW5kcztcbiAgICB9XG5cbiAgICAvLyBSZWdpc3RlciBjdXN0b20gZWxlbWVudFxuICAgIGNvbXBvbmVudHNTdG9yZVtvcHRzLnRhZ05hbWVdID0gZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG9wdHMudGFnTmFtZSwgcGFyYW0pO1xuICAgIHJldHVybiBjb21wb25lbnRzU3RvcmVbb3B0cy50YWdOYW1lXTtcbn07XG5cbkNvbXBvbmVudC5leHRlbmQgPSBmdW5jdGlvbihiYXNlQ29tcG9uZW50LCBvcHRzKSB7XG4gICAgdmFyIEJhc2UgPSBjb21wb25lbnRzU3RvcmVbYmFzZUNvbXBvbmVudF07XG4gICAgdmFyIHBhcmFtID0ge307XG4gICAgLy8gU2V0IFByb3RvdHlwZSBvZiBjdXN0b20gZWxlbWVudFxuICAgIHZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcblxuICAgIF9leHRlbmRQcm90b3R5cGUuY2FsbChwcm90bywgb3B0cyk7XG5cbiAgICBwcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgQmFzZS5wcm90b3R5cGUuY3JlYXRlZENhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChvcHRzLm9uQ3JlYXRlKSB7XG4gICAgICAgICAgICBvcHRzLm9uQ3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcHJvdG8uYXR0YWNoZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBCYXNlLnByb3RvdHlwZS5hdHRhY2hlZENhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChvcHRzLm9uQXR0YWNoKSB7XG4gICAgICAgICAgICBvcHRzLm9uQXR0YWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgX2FkZEV2ZW50TGlzdGVuZXJzLmNhbGwodGhpcywgb3B0cy5ldmVudHMpO1xuICAgIH07XG5cbiAgICBwcm90by5kZXRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIEJhc2UucHJvdG90eXBlLmRldGFjaGVkQ2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG9wdHMub25EZXRhY2gpIHtcbiAgICAgICAgICAgIG9wdHMub25EZXRhY2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sgPSBmdW5jdGlvbihhdHRyTmFtZSwgb2xkVmFsLCBuZXdWYWwpIHtcbiAgICAgICAgQmFzZS5wcm90b3R5cGUuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChvcHRzLm9uQXR0cmlidXRlc0NoYW5nZSkge1xuICAgICAgICAgICAgb3B0cy5vbkF0dHJpYnV0ZXNDaGFuZ2VbYXR0ck5hbWVdLmFwcGx5KHRoaXMsIFtvbGRWYWwsIG5ld1ZhbF0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHBhcmFtLnByb3RvdHlwZSA9IHByb3RvO1xuXG4gICAgLy8gUmVnaXN0ZXIgY3VzdG9tIGVsZW1lbnRcbiAgICByZXR1cm4gZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG9wdHMudGFnTmFtZSwgcGFyYW0pO1xufTtcblxuZnVuY3Rpb24gX2FkZEV2ZW50TGlzdGVuZXJzKGV2ZW50cykge1xuICAgIGZvciAodmFyIGV2dCBpbiBldmVudHMpIHtcbiAgICAgICAgdmFyIHBhcmFtID0gZXZ0LnNwbGl0KCcgJyk7XG4gICAgICAgIHZhciBldmVudE5hbWUgPSBwYXJhbVswXTtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcihwYXJhbVsxXSk7XG4gICAgICAgIHZhciBoYW5kbGVyID0gZXZlbnRzW2V2dF07XG4gICAgICAgIHZhciBmbiA9IHRoaXNbaGFuZGxlcl0gPSB0aGlzW2hhbmRsZXJdLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBfZXh0ZW5kUHJvdG90eXBlKHByb3Rvcykge1xuICAgIGZvciAodmFyIHByb3RvIGluIHByb3Rvcykge1xuICAgICAgICBzd2l0Y2ggKHByb3RvKSB7XG4gICAgICAgICAgICBjYXNlICdleGVuZHMnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb25DcmVhdGUnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb25EZXRhY2gnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb25BdHRyaWJ1dGVzQ2hhbmdlJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ29uQXR0YWNoJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3RhZ05hbWUnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZnJhZ21lbnQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3R5bGUnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZXZlbnRzJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpc1twcm90b10gPSBwcm90b3NbcHJvdG9dO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwidmFyIG1peGlucyA9IHt9O1xudmFyIHZhcmlhYmxlcyA9IHt9O1xuXG52YXIgU3R5bGl6ZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5TdHlsaXplci5wcm90b3R5cGUuc3RyaW5naWZ5ID0gZnVuY3Rpb24oc3R5bGUpIHtcbiAgICB2YXIgcmV0ID0gJyc7XG5cbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiBzdHlsZSkge1xuICAgICAgICByZXQgKz0gc2VsZWN0b3IgKyAneyc7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0gc3R5bGVbc2VsZWN0b3JdO1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHZhciBzZXR0aW5nID0gcHJvcGVydGllc1twcm9wXTtcbiAgICAgICAgICAgIHJldCArPSBwcm9wICsgJzonICsgc2V0dGluZyArICc7JztcbiAgICAgICAgfVxuICAgICAgICByZXQgPSByZXQuc2xpY2UoMCwgcmV0Lmxlbmd0aCAtIDEpO1xuICAgICAgICByZXQgKz0gJ30nO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG59O1xuXG5TdHlsaXplci5wcm90b3R5cGUuY3JlYXRlU3R5bGVUYWcgPSBmdW5jdGlvbihzdHlsZSkge1xuICAgIHZhciB0YWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHN0eWxlID0gdGhpcy5zdHJpbmdpZnkoc3R5bGUpO1xuICAgIHRhZy5pbm5lclRleHQgPSBzdHlsZTtcbiAgICByZXR1cm4gdGFnO1xufTtcblxuU3R5bGl6ZXIucHJvdG90eXBlLnJlZ2lzdGVyTWl4aW5zID0gZnVuY3Rpb24oa2V5LCBmdW5jKSB7XG4gICAgbWl4aW5zW2tleV0gPSBmdW5jO1xufTtcblxuU3R5bGl6ZXIucHJvdG90eXBlLnJlZ2lzdGVyVmFyaWFibGVzID0gZnVuY3Rpb24oa2V5LCB2YWwpIHtcbiAgICB2YXJpYWJsZXNba2V5XSA9IHZhbDtcbn07XG5cblN0eWxpemVyLnByb3RvdHlwZS5nZXRWYXJpYWJsZSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICghdmFyaWFibGVzW2tleV0pIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignVmFyaWFibGUgJyArIGtleSArICcgZG9lcyBub3QgZXhpc3QuJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHZhcmlhYmxlc1trZXldO1xufTtcblxuU3R5bGl6ZXIucHJvdG90eXBlLnRvSGV4ID0gZnVuY3Rpb24ocmdiKSB7XG4gICAgcmdiID0gcmdiLnJlcGxhY2UoJyAnLCAnJykuc3BsaXQoJywnKTtcbiAgICByZXR1cm4gXCIjXCIgKyBjb21wb25lbnRUb0hleChyZ2JbMF0pICsgY29tcG9uZW50VG9IZXgocmdiWzFdKSArIGNvbXBvbmVudFRvSGV4KHJnYlsyXSk7XG5cbiAgICBmdW5jdGlvbiBjb21wb25lbnRUb0hleChjKSB7XG4gICAgICAgIHZhciBoZXggPSBjLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuIGhleC5sZW5ndGggPT0gMSA/IFwiMFwiICsgaGV4IDogaGV4O1xuICAgIH1cbn07XG5cblN0eWxpemVyLnByb3RvdHlwZS50b1JHQiA9IGZ1bmN0aW9uKGhleCkge1xuICAgIHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcbiAgICByZXR1cm4gcmVzdWx0ID8gJ3JnYignICsgW1xuICAgICAgICBwYXJzZUludChyZXN1bHRbMV0sIDE2KSxcbiAgICAgICAgcGFyc2VJbnQocmVzdWx0WzJdLCAxNiksXG4gICAgICAgIHBhcnNlSW50KHJlc3VsdFszXSwgMTYpXG4gICAgXS5qb2luKCcsJykgKyAnKScgOiBudWxsO1xufTtcblxuU3R5bGl6ZXIucHJvdG90eXBlLnRvUkdCYSA9IGZ1bmN0aW9uKGhleCwgb3BhY2l0eSkge1xuICAgIHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcbiAgICByZXR1cm4gcmVzdWx0ID8gJ3JnYmEoJyArIFtcbiAgICAgICAgcGFyc2VJbnQocmVzdWx0WzFdLCAxNiksXG4gICAgICAgIHBhcnNlSW50KHJlc3VsdFsyXSwgMTYpLFxuICAgICAgICBwYXJzZUludChyZXN1bHRbM10sIDE2KSxcbiAgICAgICAgb3BhY2l0eVxuICAgIF0uam9pbignLCcpICsgJyknIDogbnVsbDtcbn07XG5cblN0eWxpemVyLnByb3RvdHlwZS5nZXRNaXhpbnMgPSBmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIW1peGluc1trZXldKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ01peGluICcgKyBrZXkgKyAnIGRvZXMgbm90IGV4aXN0LicpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBtaXhpbnNba2V5XTtcbn07XG4iLCJ2YXIgbW9kdWxlU3RvcmUgPSB7fTtcblxudmFyIE1vZHVsZSA9IGZ1bmN0aW9uKCkge307XG5cbk1vZHVsZS5wcm90b3R5cGUuZXhwb3J0ID0gZnVuY3Rpb24oa2V5LCBmdW5jKSB7XG4gICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kdWxlIG5hbWUgaXMgbm90IGEgc3RyaW5nLicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZHVsZSBpcyBub3QgYSBmdW5jdGlvbi4nKTtcbiAgICB9XG4gICAgbW9kdWxlU3RvcmVba2V5XSA9IGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgZG9uZShmdW5jKCkpO1xuICAgIH07XG59O1xuXG5Nb2R1bGUucHJvdG90eXBlLmltcG9ydCA9IGZ1bmN0aW9uKG1vZHVsZXMpIHtcbiAgICB2YXIgbG9hZGVkID0gMDtcbiAgICB2YXIgY291bnQgID0gT2JqZWN0LmtleXMobW9kdWxlcyk7XG4gICAgdmFyIHZvdyA9IFZvdygpO1xuICAgIHZhciByZXQgPSB7fTtcbiAgICB2YXIgdXJsO1xuXG4gICAgX2ltcG9ydChjb3VudC5wb3AoKSwgdm93KTtcblxuICAgIHZvdy5wcm9taXNlLmFuZCA9IHt9O1xuICAgIHZvdy5wcm9taXNlLmFuZC5leHBvcnQgPSBmdW5jdGlvbihrZXksIGZ1bmMpIHtcbiAgICAgICAgbW9kdWxlU3RvcmVba2V5XSA9IGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgICAgIHZvdy5wcm9taXNlXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmV0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZVN0b3JlW2tleV0gPSBmdW5jLmJpbmQodGhpcywgcmV0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCByZXQpO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgICAgICAuZG9uZShkb25lKTtcbiAgICAgICAgfTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB2b3cucHJvbWlzZS5hbmQuaW1wb3J0ID0gZnVuY3Rpb24obW9kdWxlcykge1xuICAgICAgICByZXR1cm4gdm93LnByb21pc2UudGhlbih0aGlzLmltcG9ydC5iaW5kKHRoaXMsIG1vZHVsZXMpKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICByZXR1cm4gdm93LnByb21pc2U7XG5cbiAgICBmdW5jdGlvbiBfaW1wb3J0KGtleSwgcHJvbWlzZSkge1xuICAgICAgICB2YXIgdXJsID0gbW9kdWxlc1trZXldO1xuXG4gICAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2R1bGUgbmFtZSBpcyBub3QgYSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVVJMIGlzIG5vdCBhIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtb2R1bGUgPSBtb2R1bGVTdG9yZVtrZXldO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFtb2R1bGUpIHtcbiAgICAgICAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcblxuICAgICAgICAgICAgc2NyaXB0LnR5cGUgPSBcInRleHQvamF2YXNjcmlwdFwiO1xuICAgICAgICAgICAgc2NyaXB0LnNyYyA9IHVybDtcbiAgICAgICAgICAgIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXIgPSBWb3coKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2FkaW5nICcgKyBrZXkgKyAnLi4uJyk7XG5cbiAgICAgICAgICAgICAgICBkZWZlci5wcm9taXNlLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXRba2V5XSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY291bnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlLnJlc29sdmUocmV0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9pbXBvcnQoY291bnQucG9wKCksIHByb21pc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBzY3JpcHQucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgbW9kdWxlU3RvcmVba2V5XShkZWZlci5yZXNvbHZlKTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzLCBrZXkpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9taXNlLnJlc29sdmUobW9kdWxlKCkpO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsInZhciBEYXRhID0gRmFjdG9yeS5leHRlbmQoe1xuICAgIGFqYXg6IGZ1bmN0aW9uKG9wdHMpe1xuICAgICAgICBpZiAoIW9wdHMudXJsKSB0aHJvdyBuZXcgRXJyb3IoJ1VybCBpcyByZXF1aXJlZC4nKTtcbiAgICAgICAgaWYgKCFvcHRzLnR5cGUpIHRocm93IG5ldyBFcnJvcignUmVxdWVzdCB0eXBlIGlzIHJlcXVpcmVkLicpO1xuXG4gICAgICAgIG9wdHMuY29udGVudFR5cGUgPSBvcHRzLmNvbnRlbnRUeXBlIHx8ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgb3B0cy5lbmNvZGUgICAgICA9IG9wdHMuZW5jb2RlIHx8IG51bGw7XG4gICAgICAgIG9wdHMucGF5bG9hZCAgICAgPSBvcHRzLnBheWxvYWQgfHwgbnVsbDtcbiAgICAgICAgb3B0cy5pbmRleEJ5ICAgICA9IG9wdHMuaW5kZXhCeSB8fCAnaWQnO1xuXG4gICAgICAgIHJldHVybiBhamF4KG9wdHMpXG4gICAgICAgICAgICAgICAgLnRoZW4oX3BhcnNlLmJpbmQodGhpcykpXG4gICAgICAgICAgICAgICAgLnRoZW4oX3VwZGF0ZVN0b3JlLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGZ1bmN0aW9uIF91cGRhdGVTdG9yZShyc3ApIHtcbiAgICAgICAgICAgIGlmIChvcHRzLnR5cGUudG9VcHBlckNhc2UoKSA9PT0gJ0RFTEVURScpIHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyc3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHJzcC5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5zZXQoZFtvcHRzLmluZGV4QnldLCBkKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiByc3AgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zZXQocnNwW29wdHMuaW5kZXhCeV0sIHJzcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyc3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHJzcC5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KGRbb3B0cy5pbmRleEJ5XSwgZCk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcnNwID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldChyc3Bbb3B0cy5pbmRleEJ5XSwgcnNwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnNwO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX3BhcnNlKHJzcCkge1xuICAgICAgICAgICAgaWYgKG9wdHMucGFyc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0cy5wYXJzZShyc3ApO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlKHJzcCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJzcCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShyc3ApO1xuICAgIH1cbn0pO1xuXG52YXIgZGF0YXN0b3JlID0ge307XG52YXIgUmVzb3VyY2UgPSBmdW5jdGlvbigpIHt9O1xuXG5SZXNvdXJjZS5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYgKGRhdGFzdG9yZVtuYW1lXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc291cmNlICcgKyBuYW1lICsgJyBhbHJlYWR5IGV4aXN0LicpO1xuICAgIH1cblxuICAgIGRhdGFzdG9yZVtuYW1lXSA9IG5ldyBEYXRhKCk7XG4gICAgcmV0dXJuIGRhdGFzdG9yZVtuYW1lXTtcbn07XG5cblJlc291cmNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIGRhdGFzdG9yZVtuYW1lXSA/IGRhdGFzdG9yZVtuYW1lXSA6IHRoaXMucmVnaXN0ZXIobmFtZSk7XG59O1xuIiwidmFyIFJlbmRlcmVyID0gZnVuY3Rpb24oKXt9O1xuXG5SZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlVGVtcGxhdGUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRlbXBsYXRlKCk7XG59O1xuXG52YXIgVGVtcGxhdGUgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2N1cnJlbnRTdGF0ZSA9IFtdO1xuICAgIHRoaXMuX3F1ZXVlID0gW107XG4gICAgdGhpcy5fY29uZGl0aW9uYWwgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbG9vcCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9zdGFydCA9IHVuZGVmaW5lZDtcblxufTtcblxuLyoqXG4gKiBDcmVhdGUgRE9NIG5vZGVcbiAqIEBwYXJhbSAge3N0cmluZ30gdGFnTmFtZSBFbGVtZW50IG5hbWVcbiAqIEByZXR1cm4ge2luc3RhbmNlfSAgICAgICB0aGlzXG4gKi9cblRlbXBsYXRlLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbih0YWdOYW1lKXtcbiAgICB0YWdOYW1lID0gcGFyc2VUYWcodGFnTmFtZSk7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZVswXSk7XG4gICAgICAgIGlmICh0YWdOYW1lWzFdID09PSAnLicpIHtcbiAgICAgICAgICAgIGVsLmNsYXNzTmFtZSA9IHRhZ05hbWVbMl07XG4gICAgICAgIH0gZWxzZSBpZiAodGFnTmFtZVsxXSA9PT0gJyMnKSB7XG4gICAgICAgICAgICBlbC5pZCA9IHRhZ05hbWVbMl07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY3VycmVudFN0YXRlLnB1c2goZWwpO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ29wZW4nLFxuICAgICAgICBmbjogZm5cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGVsID0gZ3JhYkxhc3QuY2FsbCh0aGlzKTtcbiAgICAgICAgY2xhc3NOYW1lID0gZXZhbHVhdGUoZCwgY2xhc3NOYW1lKTtcbiAgICAgICAgdmFyIHNlcGFyYXRvciA9IGVsLmNsYXNzTmFtZS5sZW5ndGggPiAwID8gJyAnIDogJyc7XG4gICAgICAgIGlmICghaGFzQ2xhc3MoZWwsY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgZWwuY2xhc3NOYW1lICs9IHNlcGFyYXRvciArIGNsYXNzTmFtZTtcbiAgICAgICAgfVxuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2FkZENsYXNzJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUudGV4dCA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBlbCA9IGdyYWJMYXN0LmNhbGwodGhpcyk7XG4gICAgICAgIGVsLnRleHRDb250ZW50ID0gZXZhbHVhdGUoZCwgY29udGVudCk7XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIGZuOiBmblxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVGVtcGxhdGUucHJvdG90eXBlLmF0dHIgPSBmdW5jdGlvbihhdHRyLCB2YWwpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBlbCA9IGdyYWJMYXN0LmNhbGwodGhpcyk7XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZShldmFsdWF0ZShkLCBhdHRyKSwgZXZhbHVhdGUoZCwgdmFsKSk7XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAnYXR0cicsXG4gICAgICAgIGZuOiBmblxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVGVtcGxhdGUucHJvdG90eXBlLnN0eWxlID0gZnVuY3Rpb24oYXR0ciwgdmFsKSB7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24oZCkge1xuICAgICAgICB2YXIgZWwgPSBncmFiTGFzdC5jYWxsKHRoaXMpO1xuICAgICAgICBlbC5zdHlsZVtldmFsdWF0ZShkLCBhdHRyKV0gPSBldmFsdWF0ZShkLCB2YWwpO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N0eWxlJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBlbCA9IGdyYWJMYXN0LmNhbGwodGhpcyk7XG4gICAgICAgIGNsYXNzTmFtZSA9IGV2YWx1YXRlKGQsIGNsYXNzTmFtZSk7XG4gICAgICAgIGlmIChoYXNDbGFzcyhlbCxjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICB2YXIgcmVnID0gbmV3IFJlZ0V4cCgnKFxcXFxzfF4pJytjbGFzc05hbWUrJyhcXFxcc3wkKScpO1xuICAgICAgICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UocmVnLCcgJyk7XG4gICAgICAgIH1cbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5fcXVldWUucHVzaCh7XG4gICAgICAgIHR5cGU6ICdyZW1vdmVDbGFzcycsXG4gICAgICAgIGZuOiBmblxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVGVtcGxhdGUucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGVsID0gdGhpcy5fY3VycmVudFN0YXRlLnBvcCgpO1xuICAgICAgICBpZiAodGhpcy5fY3VycmVudFN0YXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5wcmV2aW91c0ZyYWdtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSBncmFiTGFzdC5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgfVxuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2Nsb3NlJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUuYXBwZW5kTGFzdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZm4gPSBmdW5jdGlvbihkKSB7XG4gICAgICB2YXIgZWwgPSB0aGlzLl9jdXJyZW50U3RhdGUucG9wKCk7XG4gICAgICB0aGlzLnByZXZpb3VzRnJhZ21lbnQuYXBwZW5kQ2hpbGQoZWwpO1xuICB9LmJpbmQodGhpcyk7XG4gIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgdHlwZTogJ2VuZCcsXG4gICAgICBmbjogZm5cbiAgfSk7XG4gIHJldHVybiB0aGlzOyAgXG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUuaWYgPSBmdW5jdGlvbihmdW5jT3JLZXkpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHRoaXMuX3N0YXRlID0gJ2NvbmRpdGlvbmFsJztcbiAgICAgICAgZnVuY09yS2V5ID0gZXZhbHVhdGUoZCwgZnVuY09yS2V5KTtcbiAgICAgICAgdGhpcy5fY29uZGl0aW9uYWwgPSAhIWZ1bmNPcktleTtcbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5fcXVldWUucHVzaCh7XG4gICAgICAgIHR5cGU6ICdpZicsXG4gICAgICAgIGZuOiBmblxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVGVtcGxhdGUucHJvdG90eXBlLmVsc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHRoaXMuX2NvbmRpdGlvbmFsID0gIXRoaXMuX2NvbmRpdGlvbmFsO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2Vsc2UnLFxuICAgICAgICBmbjogZm5cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS5lYWNoID0gZnVuY3Rpb24oZnVuY09yS2V5KSB7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICB0aGlzLl9sb29wICA9IGV2YWx1YXRlKGQsIGZ1bmNPcktleSk7XG4gICAgICAgIHRoaXMuX3N0YXRlID0gJ2xvb3AnO1xuICAgICAgICB0aGlzLl9zdGFydCA9IGk7XG4gICAgfS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX3F1ZXVlLnB1c2goe1xuICAgICAgICB0eXBlOiAnZWFjaCcsXG4gICAgICAgIGZuOiBmblxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuVGVtcGxhdGUucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgIHRoaXMuX2NvbmRpdGlvbmFsID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9zdGF0ZSAgICAgICA9IHVuZGVmaW5lZDtcbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5fcXVldWUucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkb25lJyxcbiAgICAgICAgZm46IGZuXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5UZW1wbGF0ZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMucHJldmlvdXNGcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB0aGlzLl9xdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uKHEsIGkpIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLl9zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAnY29uZGl0aW9uYWwnOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb25kaXRpb25hbCB8fCBxLnR5cGUgPT09ICdlbHNlJyB8fCBxLnR5cGUgPT09ICdkb25lJykge1xuICAgICAgICAgICAgICAgICAgICBxLmZuKGRhdGEsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2xvb3AnOlxuICAgICAgICAgICAgICAgIGlmIChxLnR5cGUgPT09ICdkb25lJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb29wLmZvckVhY2goZnVuY3Rpb24obCwgaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgc3RhcnQgPSB0aGlzLl9zdGFydCArIDE7IHN0YXJ0IDwgaTsgc3RhcnQrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb29wRm4gPSB0aGlzLl9xdWV1ZVtzdGFydF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcEZuLmZuKGwsIGopO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICBxLmZuKGRhdGEsIGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcS5mbihkYXRhLCBpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICByZXR1cm4gdGhpcy5wcmV2aW91c0ZyYWdtZW50O1xufTtcblxuZnVuY3Rpb24gZ3JhYkxhc3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRTdGF0ZVt0aGlzLl9jdXJyZW50U3RhdGUubGVuZ3RoIC0gMV07XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjbGFzc05hbWUpIHtcbiAgcmV0dXJuICEhZWwuY2xhc3NOYW1lLm1hdGNoKG5ldyBSZWdFeHAoJyhcXFxcc3xeKScrY2xhc3NOYW1lKycoXFxcXHN8JCknKSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVGFnKHRhZykge1xuICAgIHRhZyA9IHRhZy5yZXBsYWNlKC9bLiNdLywgZnVuY3Rpb24oZCkgeyByZXR1cm4gJywnICsgZCArICcsJzt9KVxuICAgICAgICAgICAgIC5zcGxpdCgnLCcpO1xuICAgIHJldHVybiB0YWc7XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlKGRhdGEsIGZ1bmNPclN0cmluZykge1xuICAgIHN3aXRjaCAodHlwZW9mIGZ1bmNPclN0cmluZykge1xuICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICByZXR1cm4gZnVuY09yU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZnVuY09yU3RyaW5nO1xuICAgIH1cbn1cbiIsInZhciBnRXZlbnRCdXMgPSBuZXcgRXZlbnRCdXMoKTs7XG5cbnZhciBUcmlvID0ge1xuICAgIEZhY3Rvcnk6IEZhY3RvcnksXG4gICAgU2VydmljZTogU2VydmljZSxcbiAgICBDb21wb25lbnQ6IENvbXBvbmVudCxcbiAgICBWb3c6IFZvdyxcbiAgICBTdHlsaXplcjogbmV3IFN0eWxpemVyKCksXG4gICAgUmVuZGVyZXI6IG5ldyBSZW5kZXJlcigpLFxuICAgIE1vZHVsZTogbmV3IE1vZHVsZSgpLFxuICAgIFJlc291cmNlOiBuZXcgUmVzb3VyY2UoKSxcbiAgICBWRVJTSU9OOiAnMC4xLjInXG59XG5cblRyaW8ucmVnaXN0ZXJHbG9iYWxFdmVudEJ1cyA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIGdFdmVudEJ1cy5yZWdpc3RlcihpZCk7XG59O1xuXG5pZiAobW9kdWxlICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBUcmlvO1xufSBlbHNlIHtcbiAgICB3aW5kb3cuVHJpbyA9IFRyaW87XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=