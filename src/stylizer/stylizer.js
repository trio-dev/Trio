var mixins = {};
var variables = {};

// All vendors prefixes needed
var _ALLVENDORS = ['-webkit-', '-moz-', '-ms-', '-o-'];
// CSS Properties/Attributes that needs prefixes. This list will grow.
var ATTRIBUTES_TO_PREFIX = ['flex', 'transition', 'transform', 'calc', 'align-self', 'flex-flow', 'linear-gradient'];
// Regex to match any string that contains words need prefixes
var IS_PREFIXABLE = new RegExp(ATTRIBUTES_TO_PREFIX.join('|'));
// Key-pair for color to hex
var COLOR_MAP = {
    'black': '#000000',
    'white': '#ffffff',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'light-gray': '#cccccc',
    'dark-gray': '#333333',
    'gray': '#666666',
    'orange': '#ffa500',
    'purple': '#8a2be2'
};

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
                setting = replaceVariable.call(this, setting);
            ret += autoPrefix(prop, setting);
        }
        ret = ret.substring(0, ret.length - 1);
        ret += '}';
    }

    return ret;

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

    function replaceVariable(setting) {
        var rgbs = setting.match(/((rgb|rgba)\([^)]*\))/gi);
        var rgb, newRgb;
        var key, val;

        if (rgbs) {
            for (var j = 0; j < rgbs.length; j++) {
                rgb = rgbs[j];
                newRgb = replaceColor.call(this, rgb);
                setting = setting.replace(rgb, newRgb);
            }
        }

        var variables = setting.match(/\$([^\$][^\s\d\,\(\)]+)/gi);

        if (variables) {
            for (var i = 0; i < variables.length; i++) {
                key = variables[i].slice(1);
                val = this.getVariable(key);
                setting = setting.replace(variables[i], val);
            }
        }

        return setting;
    }

    function replaceColor(rgb) {
        var colors = rgb.match(/\$([^\$][^\s\d\,\(\)]+)/gi);
        var key, val;

        if (colors) {
            key = colors[0].slice(1);
            val = this.getVariable(key);
            val = toRGB(val);
            rgb = rgb.replace(colors[0], val);
        }
        return rgb;
    }

    function toRGB(color) {
        if (COLOR_MAP[color]) {
            color = COLOR_MAP[color];
        }

        var isHex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        var isRGB = /((rgb|rgba)\([^)]*\))/i.exec(color);

        if (isHex) {
            return [
                parseInt(isHex[1], 16),
                parseInt(isHex[2], 16),
                parseInt(isHex[3], 16)
            ].join(',');
        } 

        if (isRGB) {
            return color.replace(/[a-z]|\(|\)/gi, '')
                .split(',')
                .slice(0, 3)
                .join(',');
        }

        throw new Error('Invalid color string.');
    }
};


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


Stylizer.prototype.getMixin = function(key) {
    if (!mixins[key]) {
        console.error('Mixin ' + key + ' does not exist.');
        return;
    }
    return mixins[key];
};
