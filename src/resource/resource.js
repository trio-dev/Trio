var Vow = require('../vow/vow');
var Model = require('../model/model');
var ajax = require('../helpers/ajax');
var param = require('../helpers/param');
var methods = ['read', 'create', 'update', 'delete'];
var Data = Model.extend({
    read: function(payload){
        return ajax({
            type: 'GET',
            url: this.url,
            contentType: this.contentType,
            isUrlEncoded: this.isUrlEncoded,
            encode: this.encode,
            payload: payload
        });
    },
    create: function(payload){
        return ajax({
            type: 'POST',
            url: this.url,
            contentType: this.contentType,
            isUrlEncoded: this.isUrlEncoded,
            encode: this.encode,
            payload: payload
        });
    },
    update: function(payload){
        return ajax({
            type: 'PUT',
            url: this.url,
            contentType: this.contentType,
            isUrlEncoded: this.isUrlEncoded,
            encode: this.encode,
            payload: payload
        });
    },
    delete: function(payload){
        return ajax({
            type: 'DELETE',
            url: this.url,
            contentType: this.contentType,
            isUrlEncoded: this.isUrlEncoded,
            encode: this.encode,
            payload: payload
        });
    },
});

var datastore = {};
var Resource = function() {
};

Resource.prototype.register = function(name, opts) {
    if (datastore[name]) {
        throw new Error('Resource ' + name + ' already exist.');
    }

    var data     = new Data();
    var indexKey = opts.indexBy || 'id';

    if (!opts.url) {
        throw new Error('Url is required.');
    }

    // Set default
    data.url          = encodeURI(opts.url);
    data.parse        = opts.parse ? opts.parse.bind(data) : parse.bind(data);
    data.encode       = opts.encode ? opts.encode.bind(data) : param.bind(data);
    data.isUrlEncoded = opts.isUrlEncoded || false;
    data.contentType  = opts.contentType || 'application/json';


    // Set up CRUD method
    methods.forEach(function(key) {
        if (typeof opts[key] === 'function') {
            data[key] = opts[key];
        }

        var oldFn = data[key];
        var newFn;

        if (key === 'delete') {
            newFn = function(payload) {
                return oldFn.call(data, payload)
                            .then(data.parse)
                            .then(_unset);
            }
        } else {
            newFn = function(payload) {
                return oldFn.call(data, payload)
                            .then(data.parse)
                            .then(_set);
            }
        }

        data[key] = newFn;
    });

    datastore[name] = data;
    // Set up indexing method
    function _set(rsp) {
        if (Array.isArray(rsp)) {
            rsp.forEach(function(d) {
                data.set(d[indexKey], d);
            });
        } else if (typeof rsp === 'object') {
            data.set(rsp[indexKey], rsp);
        }
        return rsp;
    }

    function _unset(rsp) {
        if (Array.isArray(rsp)) {
            rsp.forEach(function(d) {
                data.unset(d[indexKey], d);
            });
        } else if (typeof rsp === 'object') {
            data.unset(rsp[indexKey], rsp);
        }
        return rsp;
    }
    
    function parse(rsp) {
        return JSON.parse(rsp);
    }
};

Resource.prototype.get = function(name) {
    return datastore[name]
}



module.exports = Resource;

