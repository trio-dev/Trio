// Gloabl Resources Storage
var RESOURCE_STORE = {};

//////////////////////////////////////////////
/////////// Resource Manager Class ///////////
//////////////////////////////////////////////
var ResourceManager = function() {};

ResourceManager.prototype.register = function(opts) {
    if (!opts.name) throw new Error('Expect parameter to have property: name.');
    var Res = Resource.extend(opts);
    RESOURCE_STORE[opts.name] = new Res(opts);
};

ResourceManager.prototype.get = function(name) {
    var resource = RESOURCE_STORE[name];
    if (!resource) throw new Error('Resource ' + name + ' not found.');
    return resource;
};

//////////////////////////////////////////////
/////////////// Resource Class ///////////////
//////////////////////////////////////////////
var Resource = {};

Resource._constructor = function(opts) {
    this.cache = new LruCache(opts.cacheSize);
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

Resource._constructor.prototype.interceptResponse = function(res) { return res; };
Resource._constructor.prototype.interceptRequest = function(req) { return req; };

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

Resource.extend = extend;

//////////////////////////////////////////////
////////////////// LRU Cache /////////////////
//////////////////////////////////////////////

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


