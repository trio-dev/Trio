// Gloabl Resources Storage
var RESOURCE_STORE = {};

//////////////////////////////////////////////
/////////// Resource Manager Class ///////////
//////////////////////////////////////////////
var ResourceManager = function() {};

ResourceManager.prototype.register = function(opts) {
    if (!opts.name) throw new Error('Expect parameter to have property: name.');
    var Res = Resource.extend(opts);
    RESOURCE_STORE[opts.name] = new Res();
};

ResourceManager.prototype.get = function(name) {
    var resource = RESOURCE_STORE[name];
    if (!resource) throw new Error('Resource ' + name + ' not found.');
    return resource;
};

//////////////////////////////////////
/////////// Resource Class ///////////
//////////////////////////////////////
var Resource = {};

Resource._constructor = function() {};

// Decorated 
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
Resource.extend = extend;