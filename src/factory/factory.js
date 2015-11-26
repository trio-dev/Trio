(function() {
    var factoryIdGenerator = scope.idGenerator('factory');
    var Signal = scope.Signal;

    //////////////////////////////////////////////////////
    ////////////////////// Factory ///////////////////////
    //////////////////////////////////////////////////////
    /// Sync data with different resource, and manage data 
    /// as the single source of truth for components

    // NOTE:
    // Planned Features--
    //  1. Schema enforcement

    var Factory = {};

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
        var resource = Trio.Resource.get(resourceName);

        if (!resource) throw new Error('Resource ' + resourceName + ' does not exist.');

        this.resources[resourceName] = resource;
        this.connect(resource.uuid);
        map.call(this, resource);
        this.on('update:' + resource.uuid, map.bind(this, resource));

    };

    Factory.extend = scope.extend;
    Trio.Factory = Factory;

})();
