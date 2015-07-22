var Stylizer = {};
var mixins = {};
var variables = {};

Stylizer.stringify = function(style) {
    var ret = '';

    for (var selector in style) {
        ret += selector + '{';
        var properties = style[selector];
        for (var prop in properties) {
            var setting = properties[prop];
            ret += prop + ':' + setting + ';';
        }
        ret = ret.slice(0, ret.length - 1);
        ret += '}';
    }

    return ret;
};

Stylizer.registerMixins = function(key, func) {
    mixins[key] = func;
};

Stylizer.registerVariables = function(key, val) {
    variables[key] = val;
};

Stylizer.getVariable = function(key) {
    return variables[key];
};

Stylizer.Mixins = function(key, opts) {
    if (!mixins[key]) {
        console.error('Mixin for ' + key + ' does not exist');
        return;
    }
    return mixins[key].call(this, opts);
};

module.exports = Stylizer;