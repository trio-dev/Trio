var GLOBAL_AJAX_REQUEST_INTERCEPT = function(req) { 
    return req;
};
var GLOBAL_AJAX_RESPONSE_INTERCEPT = function(res) {
    return res;
};

var Ajax = function(opts) {
    var xhr        = new XMLHttpRequest();
    xhr.onload  = function() {
        var response = GLOBAL_AJAX_RESPONSE_INTERCEPT(xhr);
        opts.onload(response);
    };

    this.url     = opts.url;
    this.type    = opts.type.toUpperCase();
    this.headers = {};
    this.xhr     = xhr;
    GLOBAL_AJAX_REQUEST_INTERCEPT(this);
};

Ajax.prototype.setUrl = function(url) {
    if (!url) throw new Error('Expect parameter: url.');
    this.url = url;
};

Ajax.prototype.setType = function(type) {
    if (!type) throw new Error('Expect parameter: type.');
    this.type = type.toUpperCase();
};

Ajax.prototype.setHeader = function(key, value) {
    this.headers[key] = value;
};

Ajax.prototype.encodeUrlParam = function(param) {
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

Ajax.prototype.send = function(payload) {
    if (!this.url) throw new Error('Expect request to contain property: url.');
    if (!this.type) throw new Error('Expect request to contain property: type.');

    this.xhr.open(this.type, this.url);

    for (var header in this.headers) {
        this.xhr.setRequestHeader(header, this.headers[header]);
    }

    if (payload) {
        this.xhr.send(payload);
    } else {
        this.xhr.send();
    }
};
