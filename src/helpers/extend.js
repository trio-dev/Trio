function extend(methods) {
    var parent = this._constructor;

    if (!parent) {
        return;
    }

    var staticAttr = {};
    var child = function() {
        for (var key in staticAttr) {
            this[key] = staticAttr[key];
        }
        parent.apply(this, arguments);
    };
    
    var extended = {};

    for (var prop in parent.prototype) {
        if (Object.prototype.hasOwnProperty.call(parent.prototype, prop)) {
            extended[prop] = parent.prototype[prop];
        }
    }

    for (var met in methods) {
        if (Object.prototype.hasOwnProperty.call(methods, met)) {
            var method = methods[met];
            if (typeof method === 'function') {
                extended[met] = methods[met];
            } else {
                staticAttr[met] = methods[met];
            }
        }
    }

    child.prototype = Object.create(extended);

    return child;
}
