var componentIdGenerator = idGenerator('component');
var COMPONENT_STORE = {};
var COMPONENT_DATASTORE = {};

//////////////////////////////////////////////////////
///////////////// COMPONENT MANAGER //////////////////
//////////////////////////////////////////////////////

var ComponentManager = {};

ComponentManager.register = function(opts) {
    if (COMPONENT_STORE[opts.tagName]) {
        return COMPONENT_STORE[opts.tagName];
    }

    var component = new Component(opts);
    COMPONENT_STORE[opts.tagName] = component;
    return component;
};

ComponentManager.get = function(tagName) {
    return COMPONENT_STORE[tagName];
};

//////////////////////////////////////////////////////
///////////////////// COMPONENT //////////////////////
//////////////////////////////////////////////////////

var Component = function(opts) {
    this.tagName = opts.tagName;
    this.registerElement(opts);
    this.dataKeygen = idGenerator(this.tagName);
};

Component.prototype.setData = function(data) {
    var dataKey = this.dataKeygen();
    COMPONENT_DATASTORE[dataKey] = data;
    return dataKey;
};

Component.prototype.getData = function(dataKey) {
    return COMPONENT_DATASTORE[dataKey];
};

/**
 * Render Helper Method
 * 1. If there is data, save it in COMPONENT_DATASTORE, get dataKey
 * 2. Render <custom-element data-key='dataKey'></custom-element>
 */
Component.prototype.createElement = function(data) {
    var component = document.createElement(this.tagName);
    component.patch(data);
    return component;
};

/**
 * Register Custom Element using HTML5 API
 */
Component.prototype.registerElement = function(opts) {
    // Set Prototype of custom element
    var proto = Object.create(HTMLElement.prototype);
    var tmpl   = opts.template || {};

    proto.createdCallback = function() {
        var shadow, dataKey, data, frag;
        
        if (!tmpl.render || !tmpl.patch) {
            throw new Error('Trio.Template instance not found.');
        }

        // Create shadow root
        shadow = this.createShadowRoot();

        // Grab data from COMPONENT
        dataKey = this.getAttribute('data-key');
        data = COMPONENT_DATASTORE[dataKey];

        // Append rendered fragments into shadowRoot
        frag = opts.template.render(data);
        replaceStyleHost.call(this, frag);

        shadow.appendChild(frag);

        delete COMPONENT_DATASTORE[dataKey];

        // Set Trio uuid and signal
        this.uuid = componentIdGenerator();
        new Signal(this.uuid, this);

        // Create patch method
        this.patch = function(data) {
            tmpl.patch(shadow, data);
            replaceStyleHost.call(this, shadow);
        };

        // Extend opts into element context
        _extend(this, opts);

        if (opts.onCreate) {
            opts.onCreate.apply(this, arguments);
        }

        function _extend(obj, extendedObject) {
            var blacklist = {
                onChange: true,
                onAttach: true,
                onDetach: true,
                onCreate: true,
                createdCallback: true,
                attachedCallback: true,
                detachedCallback: true,
                attributeChangedCallback: true,
                tagName: true
            };

            for (var key in extendedObject) {
                if (!blacklist[key]) {
                    obj[key] = extendedObject[key];
                }
            }
        }

        function replaceStyleHost(root) {
            if (window && window.ShadowDOMPolyfill) {
                var list = root.getElementsByTagName('style');
                Array.prototype.forEach.call(list, function (style) {
                    var text = style.textContent
                        .replace(/:host\b/gm, this.tagName.toLowerCase())
                        .replace(/::shadow\b/gm, ' ')
                        .replace(/::content\b/gm, ' ');
                    style.textContent = text;
                }.bind(this));
            }
        }
    };

    proto.attachedCallback = function() {
        if (opts.onAttach) {
            opts.onAttach.apply(this, arguments);
        }
    };

    proto.detachedCallback = function() {
        if (opts.onDetach) {
            opts.onDetach.apply(this, arguments);
        }
    };

    proto.attributeChangedCallback = function() {
        if (opts.onChange) {
            opts.onChange.apply(this, arguments);
        }
    };

    document.registerElement(opts.tagName, {
        prototype: proto
    });
};
