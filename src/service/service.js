(function() {
    var serviceIdGenerator = scope.idGenerator('service');
    var Signal = scope.Signal;
    var extend = scope.extend;

    //////////////////////////////////////////////////////
    ////////////////////// Service ///////////////////////
    //////////////////////////////////////////////////////
    /// Service is a layer for components and factory to 
    /// work with each other. It exposes a method call 
    /// implement to connect two modules togther. Connected
    /// module can communicate via Signals.

    var Service = {};

    Service._constructor = function(opts) {
        this.uuid = serviceIdGenerator();
        new Signal(this.uuid, this);
        this.onReady(opts);
    };

    // Invoke on instantiation of Service
    Service._constructor.prototype.onReady = function() {
        // To be implemented by instance
    };

    // Invoke on Service.start()
    Service._constructor.prototype.onStart = function() {
        // To be implemented by instance
    };

    // Invoke on Service.stop()
    Service._constructor.prototype.onStop = function() {
        // To be implemented by instance
    };

    Service._constructor.prototype.start = function(opts) {
        this.onStart(opts);
        this.on(this.emit.bind(this));
    };

    Service._constructor.prototype.stop = function(opts) {
        this.onStop(opts);
        this.reset();
    };

    // Expect uuid from an Trio module. This method will make a
    // connection with the other signal, and on any pulse, re-emit
    // it to all other implemented modules.
    Service._constructor.prototype.implement = function(inst) {
        if (inst && inst.uuid) {
            this.connect(inst.uuid);
        } else {
            throw new Error('Expect parameter to contains property uuid.');
        }
    };

    Service.extend = extend;
    Trio.Service = Service;
    
})();
