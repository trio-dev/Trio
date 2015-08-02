var Vow = require('../vow/vow');
var Model = require('../model/model');
var Data;

var datastore = {};
var Resource = function() {
};

Resource.prototype.register = function(name, opts) {
    if (datastore[name]) {
        throw new Error('Resource ' + name + ' already exist.');
    }

    var data = new Data(opts);

    datastore[name] = data;
};

Data = Model.extend({
    initialize: function(opts) {
        opts.url = encodeURI(opts.url);
        (['parse', 'param']).forEach(function(key) {
            if (typeof opts[key] === function) {
                this[key] = opts[key];
            }
        }.bind(this));

        this.read = this.read.apply(this, arguments)
                        .then(this.parse)
                        .then(this.indexBy);
    },

    read: function(payload){
        if (this.get('isUrlEncoded')) {
            return ajax({
                type: 'GET',
                url: this.get('url') + '?' + encodeURI(this.param(payload)),
                contentType: 'application/json'
            });
        } else {
            return ajax({
                type: 'GET',
                url: this.get('url'),
                contentType: 'application/json',
                payload: payload
            });
        }
    },

    create: function(payload){
        return ajax({
            type: 'POST',
            url: this.get('url'),
            contentType: 'application/json',
            payload: payload
        });
    },

    update: function(payload){
        return ajax({
            type: 'PUT',
            url: this.get('url'),
            contentType: 'application/json',
            payload: payload
        });
    },

    delete: function(payload){
        return ajax({
            type: 'DELETE',
            url: this.get('url'),
            contentType: 'application/json',
            payload: payload
        });
    },

    param: function(object) {
        var encodedString = '';
        for (var prop in object) {
            if (object.hasOwnProperty(prop)) {
                if (encodedString.length > 0) {
                    encodedString += '&';
                }
                encodedString += encodeURI(prop + '=' + object[prop]);
            }
        }
        return encodedString;
    },

    parse: function(rsp) {
        return rsp;
    },

    indexBy: function(rsp) {
        if (Array.isArray(rsp)) {
            rsp.forEach(function(d, i) {
                this.set(d.id, d);
            }.bind(this))
        } else if (typeof rsp === 'object') {
            this.set(rsp.id, rsp);
        }
    }
});

module.exports = Resource;

function ajax(opts) {
    var xhr = new XMLHttpRequest();
    var vow = Vow();

    xhr.open(opts.type.toUpperCase(), opts.url);
    xhr.setRequestHeader('Content-Type', opts.contentType);
    xhr.onload = function() {
        if (xhr.status === 200) {
            vow.resolve(xhr.responseText);
        } else {
            vow.reject(xhr.responseText);
        }
    }
    xhr.send(JSON.stringify(opts.payload || ''));

    return vow.promise;
};

function param(object) {
    var encodedString = '';
    for (var prop in object) {
        if (object.hasOwnProperty(prop)) {
            if (encodedString.length > 0) {
                encodedString += '&';
            }
            encodedString += encodeURI(prop + '=' + object[prop]);
        }
    }
    return encodedString;
}

