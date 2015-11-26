(function() {
    // Storage to store all Signals instances
    var SIGNALS_STORAGE = {};

    // Constructor for Signals
    // Example:
    // var context = {};
    // 
    // new Signal('test', context);
    // 
    // context will now have Signal methods that are exposed
    var Signal = function(uuid, origin) {
        this.storage          = {};
        this.handleAll        = null;
        this.connectors       = {};
        this.origin           = origin;
        this.uuid             = uuid;
        SIGNALS_STORAGE[uuid] = this;
        origin.on             = this.on.bind(this);
        origin.off            = this.off.bind(this);
        origin.emit           = this.emit.bind(this);
        origin.broadcast      = this.broadcast.bind(this);
        origin.reset          = this.reset.bind(this);
        origin.connect        = this.connect.bind(this);
        origin.disconnect     = this.disconnect.bind(this);
    };

    // Add listener for a specific pulse type
    // If only passing in a function, it will set that function
    // as the default handler for all pulses
    Signal.prototype.on = function(pulseType, func) {
        if (typeof pulseType === 'function') {
            this.handleAll = pulseType;
            return;
        }

        if (!this.storage[pulseType]) {
            this.storage[pulseType] = [];
        }

        if (typeof func !== 'function') {
            throw new Error('Missing callback function on ' + pulseType + '.');
        }
        
        this.storage[pulseType].push(func);
    };

    // Remove listener for a pulse
    Signal.prototype.off = function(pulseType, func) {
        var bucket = this.storage[pulseType] || [];

        bucket.forEach(function(fn, i) {
            if(fn === func) {
                bucket.splice(i, 1);
                return;
            }
        });
    };

    // Create pulse with pulseType and detail, then trigger
    // pulse type to all connectors
    Signal.prototype.emit = function(pulseType, detail) {
        var pulse, connector;

        if (typeof pulseType === 'object' && pulseType.type) {
            pulse = pulseType;
        } else if (typeof pulseType === 'string') {
            pulse = MakePulse(pulseType, detail, this.origin);
        }

        for (var id in this.connectors) {
            connector = this.connectors[id];
            connector.trigger(pulse);
        }
    };

    // Similar to emit, accepts a pulse object
    Signal.prototype.trigger = function(pulse) {
        if (!pulse.type) {
            throw new Error('Expect parameter to be a pulse');
        }

        var bucket = this.storage[pulse.type] || [];
        for (var i = 0; i < bucket.length; i++) {
            bucket[i](pulse);
        }
        if (this.handleAll) {
            this.handleAll(pulse);
        }
    };

    // Broadcast pulse type to all Signals instances
    Signal.prototype.broadcast = function(pulseType, detail) {
        var pulse = MakePulse(pulseType, detail, this.origin),
            signal;

        for (var id in SIGNALS_STORAGE) {
            signal = SIGNALS_STORAGE[id];
            signal.trigger(pulse);
        }
    };

    // Reset a specific event
    // When passing in no argument, it will reset Signal to init state
    Signal.prototype.reset = function(name) {
        if (name) {
            this.storage[name] = [];
        } else {
            this.storage = {};
            for (var connectorId in this.connectors) {
                this.disconnect(connectorId);
            }
        }
    };

    // Connect to a signal reference by a uuid.
    // When connected, Signal A will listen to pulses from Signal B
    Signal.prototype.connect = function(connectorId) {
        var connector = SIGNALS_STORAGE[connectorId];
        this.addConnector(connectorId);
        connector.addConnector(this.uuid);
    };

    // Helper method to addConnector to a signl
    Signal.prototype.addConnector = function(connectorId) {
        var connector = SIGNALS_STORAGE[connectorId];
        if (connector) {
            this.connectors[connectorId] = connector;
        } else {
            throw new Error('Cannot find connector ' + connectorId + '.');
        }
    };

    // Disconnect signal reference by a uuid
    Signal.prototype.disconnect = function(connectorId) {
        var connector = SIGNALS_STORAGE[connectorId];
        this.removeConnector(connectorId);
        connector.removeConnector(this.uuid);
    };

    // Helper method to removeConnector
    Signal.prototype.removeConnector = function(connectorId) {
        if (this.connectors[connectorId]) {
            delete this.connectors[connectorId];
        } else {
            throw new Error('Cannot find connector ' + connectorId + '.');
        }
    };

    scope.Signal = Signal;

    // Constructor to make one pulse
    function MakePulse(type, detail, origin) {
        var pulse = {
            type: type,
            detail: detail,
            origin: origin
        };

        return pulse;
    }

})();
