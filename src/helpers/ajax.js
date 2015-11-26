(function() {
    // Global Interceptor for AJAX request    
    var GLOBAL_AJAX_REQUEST_INTERCEPT = function(req) { 
        return req;
    };
    var GLOBAL_AJAX_RESPONSE_INTERCEPT = function(res) {
        return res;
    };

    // Ajax object constructor
    // 
    // Example: 
    // var request = new Ajax({
    //     type: 'GET',
    //     url: 'http://www.someapi.com/api/',
    //     onload: function(response) {
    //         console.log(response);
    //     }.bind(this)
    // });
    // 
    // request.send();
    // 
    // This will log the response object
    var Ajax = function(opts) {
        // Create XHR Object
        var xhr        = new XMLHttpRequest();

        // Intercept response with Global Interceptor
        // and then invoke opts.onload callback
        xhr.onload  = function() {
            var response = GLOBAL_AJAX_RESPONSE_INTERCEPT(xhr);
            opts.onload(response);
        };

        this.url     = opts.url;
        this.type    = opts.type.toUpperCase();
        this.headers = {};
        this.xhr     = xhr;

        // Intercept Ajax object on creation
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

    // Add request metadata to XHR, and the send
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

    scope.Ajax = Ajax;

    Trio.AJAX = {
        interceptAllRequest: function(cb) {
            GLOBAL_AJAX_REQUEST_INTERCEPT = cb;
        },
        interceptAllResponse: function(cb) {
            GLOBAL_AJAX_RESPONSE_INTERCEPT = cb;
        }
    };
    
})();
