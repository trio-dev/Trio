var Vow = require('../vow/vow');
var resources = {};
var Resource = function() {

}

Resource.prototype.register = function(name, opts) {
    resources[name] = Data(opts);
};

function Data(opts) {
    this.store = {};
    this.url = opts.url;
    this.encoded = opts.encoded;
    this.indexBy = opts.indexBy;

    this.read = function(payload){
        return ajax({
            type: 'GET',
            url: this.url,
            contentType: 'application/json',
            payload: payload
        });
    }

    this.create = function(payload){
        return ajax({
            type: 'POST',
            url: this.url,
            contentType: 'application/json',
            payload: payload
        });
    }

    this.update = function(payload){
        return ajax({
            type: 'PUT',
            url: this.url,
            contentType: 'application/json',
            payload: payload
        });
    }

    this.delete = function(payload){
        return ajax({
            type: 'DELETE',
            url: this.url,
            contentType: 'application/json',
            payload: payload
        });
    }
};

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
    xhr.send(JSON.stringify(opts.payload));
    return vow.promise;
};