(function() {
    //////////////////////////////////////////////////////
    ////////////////////// Stylizer //////////////////////
    //////////////////////////////////////////////////////
    /// Stylizer is the CSS rendering library for Trio.
    /// It allows dev to generate CSS using a set of 
    /// simple API. It has functionality similar to
    /// some pre-compiler, such as the ability to set 
    /// variables, mixins, and auto-prefix.
    
    // Storage for all variables and mixins
    var MIXINS = {};
    var VARIABLES = {};

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

    Stylizer.prototype.create = function() {
        return new CSSTemplate();
    };

    Stylizer.prototype.registerMixin = function(key, func) {
        MIXINS[key] = func;
    };

    Stylizer.prototype.registerVariable = function(key, val) {
        VARIABLES[key] = val;
    };

    Stylizer.prototype.getVariable = function(key) {
        if (!VARIABLES[key]) {
            console.error('Variable ' + key + ' does not exist.');
            return;
        }
        return VARIABLES[key];
    };

    Stylizer.prototype.getMixin = function(key) {
        if (!MIXINS[key]) {
            console.error('Mixin ' + key + ' does not exist.');
            return;
        }
        return MIXINS[key];
    };

    Trio.Stylizer = new Stylizer();

    var CSSTemplate = function() {
        this.style = {};
        this._context = null;
    };

    CSSTemplate.prototype.select = function(selector) {
        if (!this.style[selector]) {
            this.style[selector] = {};
        }
        this._context = this.style[selector];
        return this;
    };

    CSSTemplate.prototype.css = function(key, attr) {
        if (!this._context) {
            throw new Error('CSS Selector not present.');
        }

        if (typeof key === 'string') {
            addOneStyle(key, attr, this._context);
        } else if (typeof key === 'object') {
            for (var k in key) {
                addOneStyle(k, key[k], this._context);
            }
        }

        return this;

        function addOneStyle(key, attr, obj) {
            obj[key] = attr;
        }
    };

    CSSTemplate.prototype.toCSS = function() {
        var ret = '';

        for (var selector in this.style) {
            // Error for when style is not a two-layers object
            // Example:
            // cssSelector : {
            //     cssProperties: cssAttributes
            // }
            if (typeof selector !== 'string') {
                throw new Error('Invalid Style Object');
            }
            ret += selector + '{';
            var properties = this.style[selector];
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

            var VARIABLES = setting.match(/\$([^\$][^\s\d\,\(\)]+)/gi);

            if (VARIABLES) {
                for (var i = 0; i < VARIABLES.length; i++) {
                    key = VARIABLES[i].slice(1);
                    val = Stylizer.prototype.getVariable.call(this, key);
                    setting = setting.replace(VARIABLES[i], val);
                }
            }

            return setting;
        }

        function replaceColor(rgb) {
            var colors = rgb.match(/\$([^\$][^\s\d\,\(\)]+)/gi);
            var key, val;

            if (colors) {
                key = colors[0].slice(1);
                val = Stylizer.prototype.getVariable.call(this, key);
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

    CSSTemplate.prototype.toHex = function(rgb) {
        rgb = rgb.replace(' ', '').split(',');
        return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);

        function componentToHex(c) {
            var hex = (+c).toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
    };
})();
