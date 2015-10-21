var mixins = {};
var variables = {};

// All vendors prefixes needed
var _ALLVENDORS = ['-webkit-', '-moz-', '-ms-', '-o-'];
// CSS Properties/Attributes that needs prefixes. This list will grow.
var ATTRIBUTES_TO_PREFIX = ['flex', 'transition', 'transform', 'calc', 'align-self', 'flex-flow', 'linear-gradient'];
// Regex to match any string that contains words need prefixes
var IS_PREFIXABLE = new RegExp(ATTRIBUTES_TO_PREFIX.join('|'));

var Stylizer = function() {};

Stylizer.prototype.stringify = function(style) {
    var ret = '';

    for (var selector in style) {
        // Error for when style is not a two-layers object
        // Example:
        // cssSelector : {
        //     cssProperties: cssAttributes
        // }
        if (typeof selector !== 'string') {
            throw new Error('Invalid Style Object');
        }
        ret += selector + '{';
        var properties = style[selector];
        for (var prop in properties) {
            var setting = properties[prop];
            ret += autoPrefix(prop, setting);
        }
        ret = ret.substring(0, ret.length - 1);
        ret += '}';
    }

    return ret;

};

// Helper method that return css string with prefixes if necessary
function autoPrefix(prop, setting) {
    var prefixedString = '' + prop + ':' + setting + ';';

    if (prop.match(IS_PREFIXABLE)) {
        for (var i = 0; i < _ALLVENDORS.length; i++) {
            prefixedString += _ALLVENDORS[i] + prop + ':' + setting + ';';
        }
    }

    if (setting.match(IS_PREFIXABLE)) {
        for (var j = 0; j < _ALLVENDORS.length; j++) {
            prefixedString += prop + ':' + _ALLVENDORS[j] + setting + ';';
        }
    }

    return prefixedString;
}

Stylizer.prototype.createStyleTag = function(style) {
    var tag = document.createElement('style');
    style = this.stringify(style);
    tag.innerText = style;
    return tag;
};

Stylizer.prototype.registerMixin = function(key, func) {
    mixins[key] = func;
};

Stylizer.prototype.registerVariable = function(key, val) {
    variables[key] = val;
};

Stylizer.prototype.getVariable = function(key) {
    if (!variables[key]) {
        console.error('Variable ' + key + ' does not exist.');
        return;
    }
    return variables[key];
};

Stylizer.prototype.toHex = function(rgb) {
    rgb = rgb.replace(' ', '').split(',');
    return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);

    function componentToHex(c) {
        var hex = (+c).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
};

Stylizer.prototype.toRGB = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 'rgb(' + [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ].join(',') + ')' : null;
};

Stylizer.prototype.toRGBa = function(hex, opacity) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 'rgba(' + [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        opacity
    ].join(',') + ')' : null;
};

Stylizer.prototype.getMixin = function(key) {
    if (!mixins[key]) {
        console.error('Mixin ' + key + ' does not exist.');
        return;
    }
    return mixins[key];
};
