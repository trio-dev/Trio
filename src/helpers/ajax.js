var Vow = require('../vow/vow');

module.exports = function (opts) {
    var xhr = new XMLHttpRequest();
    var vow = Vow();
    var payload = opts.payload || {};
    var encode;

    if (opts.isUrlEncoded) {
        encode = opts.encode || param;
        opts.url += encodeURI(encode(payload));
    }

    xhr.open(opts.type.toUpperCase(), opts.url);
    xhr.setRequestHeader('Content-Type', opts.contentType);
    xhr.onload = function() {
        if (xhr.status === 200) {
            vow.resolve(xhr.responseText);
        } else {
            vow.reject(xhr.responseText);
        }
    }

    if (opts.isUrlEncoded) {
        xhr.send();
    } else {
        xhr.send(opts.payload ? JSON.stringify(payload) : null);
    }

    return vow.promise;
};