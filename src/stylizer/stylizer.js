var mixins = {};
var variables = {};

var Stylizer = function() {

};

Stylizer.prototype.stringify = function(style) {
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

Stylizer.prototype.createStyleTag = function(style) {
    var tag = document.createElement('style');
    style = this.stringify(style);
    tag.innerText = style;
    return tag;
}

Stylizer.prototype.registerMixins = function(key, func) {
    mixins[key] = func;
};

Stylizer.prototype.registerVariables = function(key, val) {
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
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

}

Stylizer.prototype.toRGB = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 'rgb(' + [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ].join(',') + ')' : null;
}

Stylizer.prototype.toRGBa = function(hex, opacity) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 'rgba(' + [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        opacity
    ].join(',') + ')' : null;
}

Stylizer.prototype.getMixins = function(key) {
    if (!mixins[key]) {
        console.error('Mixin ' + key + ' does not exist.');
        return;
    }
    return mixins[key];
};

module.exports = Stylizer;