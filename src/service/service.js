var serviceIdGenerator = idGenerator('service');

var Service = {};

Service._constructor = function(opts) {
    this.uuid = serviceIdGenerator();
    new Signal(this.uuid, this);
    this.onReady(opts);
};

Service._constructor.prototype.onReady = function() {
    // To be implemented by instance
};

Service._constructor.prototype.onStart = function() {
    // To be implemented by instance
};

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

Service._constructor.prototype.implement = function(inst) {
    if (inst && inst.uuid) {
        this.connect(inst.uuid);
    } else {
        throw new Error('Expect parameter to contains property uuid.');
    }
};

Service.extend = extend;
