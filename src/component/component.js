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
        var signal;
        shadow.appendChild(opts.fragment.cloneNode(true));

        this.uuid = componentIdGenerator();
        signal = new Signal(this.uuid, this);
        
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
