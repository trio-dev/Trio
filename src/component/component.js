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
Component.prototype.render = function(data) {
    var dataKey, html;
    var temp = document.createElement('div');

    if (data) {
        dataKey = this.setData(data);
        html = '<' + this.tagName + ' data-key="' + dataKey + '"></' + this.tagName + '>';
    } else {
        html = '<' + this.tagName + '></' + this.tagName + '>';
    }

    temp.innerHTML = html;
    return temp.querySelector(this.tagName);
};

/**
 * Register Custom Element using HTML5 API
 */
Component.prototype.registerElement = function(opts) {
    // Set Prototype of custom element
    var proto = Object.create(HTMLElement.prototype);
    var tmpl   = opts.template || {};

    proto.createdCallback = function() {
        var shadow, dataKey, data;
        
        if (!tmpl.render || !tmpl.patch) {
            throw new Error('Trio.Template instance not found.');
        }

        // Create shadow root
        shadow = this.createShadowRoot();

        // Grab data from COMPONENT
        dataKey = this.getAttribute('data-key');
        data = COMPONENT_DATASTORE[dataKey];

        // Append rendered fragments into shadowRoot
        shadow.appendChild(opts.template.render(data));

        delete COMPONENT_DATASTORE[dataKey];

        // Set Trio uuid and signal
        this.uuid = componentIdGenerator();
        new Signal(this.uuid, this);

        // Create patch method
        this.patch = function(data) {
            tmpl.patch(shadow, data);
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
