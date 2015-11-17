var componentIdGenerator = idGenerator('component');
var COMPONENT_STORE = {};
var Component = {};

Component.register = function(opts) {
    if (COMPONENT_STORE[opts.tagName]) {
        return COMPONENT_STORE[opts.tagName];
    }

    // Set Prototype of custom element
    var proto = Object.create(HTMLElement.prototype);

    proto.createdCallback = function() {
        var tmpl   = opts.template || {};
        var shadow, trio;
        
        if (!tmpl.render || !tmpl.patch) {
            throw new Error('Trio.Template instance not found.');
        }

        shadow = this.createShadowRoot();
        shadow.appendChild(opts.template.render());

        // Create trio object to store trio context
        trio = {
            uuid: componentIdGenerator(),
            render: tmpl.render.bind(tmpl),
            patch: function(data) {
                tmpl.patch(shadow, data);
            }
        };

        new Signal(trio.uuid, trio);
        trio = _extend(trio, opts);

        this.trio = trio;

        if (opts.onCreate) {
            opts.onCreate.apply(this, arguments);
        }

        function _extend(obj, extendedObject) {
            var blacklist = {
                onChange: true,
                onAttach: true,
                onDetach: true,
                onCreate: true,
                uuid: true,
                on: true,
                off: true,
                emit: true,
                connect: true,
                broadcast: true,
                disconnect: true,
                reset: true
            };

            for (var key in extendedObject) {
                if (!blacklist[key]) {
                    obj[key] = extendedObject[key];
                }
            }
            return obj;
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

    // Register custom element
    COMPONENT_STORE[opts.tagName] = document.registerElement(opts.tagName, {
        prototype: proto
    });

    return COMPONENT_STORE[opts.tagName];
};
