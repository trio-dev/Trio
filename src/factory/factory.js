var Factory = {};
var factoryIdGenerator = idGenerator('factory');

Factory._constructor = function(opts) {
    this.attributes = {};
    this.uuid       = factoryIdGenerator();
    this.resources  = {};
    new Signal(this.uuid, this);

    this.initialize(opts);
};

Factory._constructor.prototype.initialize = function() {};

/**
 * Sync factory with resourceName, and connect with resource's signal.
 * Map callback will be invoked with the resource object passed in on first sync, 
 * and every time resource is updated.
 */
Factory._constructor.prototype.sync = function(resourceName, map) {
    var resource = RESOURCE_STORE[resourceName];

    if (!resource) throw new Error('Resource ' + resourceName + ' does not exist.');

    this.resources[resourceName] = resource;
    this.connect(resource.uuid);
    map.call(this, resource);
    this.on('update:' + resource.uuid, map.bind(this, resource));

};

Factory.extend = extend;
