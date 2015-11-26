(function() {
    var extend = scope.extend;
    var Signal = scope.Signal;
    var Ajax = scope.Ajax;

    //////////////////////////////////////////////
    /////////// Resource Manager Class ///////////
    //////////////////////////////////////////////
    /// A Resource Manager to manager registering 
    /// and getting resoources
    
    var ResourceManager = function() {};
    // Resources Storage
    var RESOURCE_STORE = {};

    // Use Trio.Resrouce.register({name: 'name'}) to 
    // create and register Resource
    ResourceManager.prototype.register = function(opts) {
        if (!opts.name) throw new Error('Expect parameter to have property: name.');
        var Res = Resource.extend(opts);
        RESOURCE_STORE[opts.name] = new Res(opts);
    };

    // Use Trio.Resrouce.get('name') to get access to resource
    ResourceManager.prototype.get = function(name) {
        var resource = RESOURCE_STORE[name];
        if (!resource) throw new Error('Resource ' + name + ' not found.');
        return resource;
    };

    //////////////////////////////////////////////
    ////////////////// Resource //////////////////
    //////////////////////////////////////////////
    /// Resource is a caching layer between backend
    /// and frontend. All AJAX request should go 
    /// through resource and cache as dev see fit.
    /// Resource will act as a source of truth for 
    /// Trio.Factory to sync data with.

    var resourceIdGenerator = scope.idGenerator('resource');
    
    var Resource = {};

    Resource._constructor = function(opts) {
        var cache = new LruCache(opts.cacheSize);
        this.uuid = resourceIdGenerator();
        new Signal(this.uuid, this);

        // Exposed a setter and getter to interact with LRU Cache
        this.set = cache.set.bind(this);
        this.get = cache.get.bind(this);
    };

    // Decorated ajax function
    Resource._constructor.prototype.sendRequest = function (opts, callback) {
        var request = new Ajax({
            type: opts.type,
            url: opts.url,
            onload: function(response) {
                callback(this.interceptResponse(response));
            }.bind(this)
        });

        this.interceptRequest(request);
        request.send(opts.payload);
    };

    // Intercept all Response and Request thru resource instance
    Resource._constructor.prototype.interceptResponse = function(res) { return res; };
    Resource._constructor.prototype.interceptRequest = function(req) { return req; };

    // Convenience method to encode JSON into URL param
    Resource._constructor.prototype.encodeUrlParam = function(param) {
        var encodedString = '';
        for (var prop in param) {
            if (param.hasOwnProperty(prop)) {
                if (encodedString.length > 0) {
                    encodedString += '&';
                }
                encodedString += encodeURI(prop + '=' + param[prop]);
            }
        }
        return encodedString;
    };

    // When this method is called, all Trio Factory that is synced with 
    // the resource instance will be notified
    Resource._constructor.prototype.hasBeenUpdated = function(key) {
        this.emit('update:' + this.uuid, null);
    };

    Resource.extend = extend;
    Trio.Resource = new ResourceManager();

    //////////////////////////////////////////////
    ////////////////// LRU Cache /////////////////
    //////////////////////////////////////////////
    /// LRU Cache data structure created for internal use

    var LruCache = function(size) {
        var map = {};
        var list = new DblyLinkedList();
        var maxLength = size || 0;
        
        this.set = function(key, data) {
            var node = map[key];
            var oldTail;

            if (node) {
                list.pushToHead(node);
                node.data = data;
            } else {
                list.addToHead(key, data);
                map[key] = list.head;
            }

            if (maxLength !== 0 && list.length > maxLength) {
                oldTail = list.tail;
                list.removeTail();
                delete map[oldTail.key];
            }

        };

        this.get = function(key) {
            var node = map[key];

            if (node) {
                list.pushToHead(node);
            }

            return node ? node.data : null;

        };

    };

    var DblyLinkedList = function() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    };

    DblyLinkedList.prototype.addToHead = function(key, data) {
        var node = new DblyLinkedListNode(key, data);
        var oldHead;

        if (!this.head && !this.tail) {
            this.head = node;
            this.tail = node;
        } else {
            oldHead = this.head;
            oldHead.prev = node;
            node.next = oldHead;
            this.head = node;
        }

        this.length++;

    };

    DblyLinkedList.prototype.pushToHead = function(node) {
        var oldHead = this.head;
        var prevNode = node.prev;
        var nextNode = node.next;

        if (this.head === node) {
            return;
        }

        if (prevNode && nextNode) {
            // Connect prev and next nodes
            prevNode.next = nextNode;
            nextNode.prev = prevNode;
        } else if (!nextNode) {
            // Set new tail
            this.tail = prevNode;
            this.tail.next = null;
        }

        // Push node to head
        this.head = node;
        node.next = oldHead;
        oldHead.prev = node;

    };

    DblyLinkedList.prototype.removeTail = function() {
        this.tail = this.tail.prev;
        this.tail.next = null;
        this.length--;
    };

    var DblyLinkedListNode = function(key, data) {
        this.prev = null;
        this.next = null;
        this.key  = key;
        this.data = data;
    };

})();
