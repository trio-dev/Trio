var Renderer = function(){

};

Renderer.prototype.createTemplate = function() {
    return new Template();
};

var _currentState = [];
var _queue = [];
var _conditional = undefined;
var _state;
var _loop;
var _start;
var Template = function(){};

/**
 * Create DOM node
 * @param  {string} tagName Element name
 * @return {instance}       this
 */
Template.prototype.create = function(tagName){
    tagName = parseTag(tagName);
    var fn = function() {
        var el = document.createElement(tagName[0]);
        if (tagName[1] === '.') {
            el.className = tagName[2];
        } else if (tagName[1] === '#') {
            el.id = tagName[2];
        }
        _currentState.push(el);
    }.bind(this)
    _queue.push({
        type: 'open',
        fn: fn
    });
    return this;
};

Template.prototype.addClass = function(className) {
    var fn = function(d) {
        var el = grabLast.call(this);
        className = evaluate(d, className);
        var separator = el.className.length > 0 ? ' ' : '';
        if (!hasClass(el,className)) {
            el.className += separator + className;
        }
    }.bind(this);
    _queue.push({
        type: 'addClass',
        fn: fn
    });
    return this;
};

Template.prototype.text = function(content) {
    var fn = function(d) {
        var el = grabLast.call(this);
        el.textContent = content;
    }.bind(this);
    _queue.push({
        type: 'text',
        fn: fn
    });
    return this;
};

Template.prototype.removeClass = function(className) {
    var fn = function(d) {
        var el = grabLast.call(this);
        className = evaluate(d, className);
        if (hasClass(el,className)) {
            var reg = new RegExp('(\\s|^)'+className+'(\\s|$)');
            el.className = el.className.replace(reg,' ');
        }
    }.bind(this);
    _queue.push({
        type: 'removeClass',
        fn: fn
    });
    return this;
};

Template.prototype.append = function() {
    var fn = function(d) {
        var el = _currentState.pop();
        if (_currentState.length === 0) {
            this.previousFragment.appendChild(el);
        } else {
            var parent = grabLast.call(this);
            parent.appendChild(el);
        }
    }.bind(this);
    _queue.push({
        type: 'close',
        fn: fn
    });
    return this;
};

Template.prototype.end = function() {
  var fn = function(d) {
      var el = _currentState.pop();
      this.previousFragment.appendChild(el);
  }.bind(this);
  _queue.push({
      type: 'end',
      fn: fn
  });
  return this;  
};

Template.prototype.if = function(funcOrKey) {
    var fn = function(d) {
        _state = 'conditional';
        funcOrKey = evaluate(d, funcOrKey);
        _conditional = !!funcOrKey;
    }.bind(this)
    _queue.push({
        type: 'if',
        fn: fn
    });
    return this;
}

Template.prototype.else = function() {
    var fn = function(d) {
        _conditional = !_conditional;
    }.bind(this);
    _queue.push({
        type: 'else',
        fn: fn
    });
    return this;
}

Template.prototype.each = function(funcOrKey) {
    var fn = function(d, i) {
        funcOrKey = evaluate(d, funcOrKey);
        _loop  = funcOrKey;
        _state = 'loop';
        _start = i;
    }.bind(this);
    _queue.push({
        type: 'each',
        fn: fn
    });
    return this;
}

Template.prototype.done = function() {
    var fn = function(d, i) {
        _conditional = undefined;
        _state       = undefined;
    }.bind(this);
    _queue.push({
        type: 'done',
        fn: fn
    });
    return this;
}

Template.prototype.render = function(data) {
    this.previousFragment = document.createDocumentFragment();
    _queue.forEach(function(q, i) {
        switch (_state) {
            case 'conditional':
                if (_conditional || q.type === 'else' || q.type === 'done') {
                    q.fn(data, i);
                }
                break;
            case 'loop':
                if (q.type === 'done') {
                    _loop.forEach(function(l, j) {
                        for (var start = _start + 1; start < i; start++) {
                            var loopFn = _queue[start];
                            loopFn.fn(l, j);
                        }
                    }.bind(this));
                    q.fn(data, i);
                }
                break;
            default:
                q.fn(data, i);
                break;
                
        }
    }.bind(this));

    return this.previousFragment;
};

function grabLast() {
    return _currentState[_currentState.length - 1];
};

function hasClass(el, className) {
  return !!el.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
};

function parseTag(tag) {
    tag = tag.replace(/[.#]/, function(d) { return ',' + d + ','})
             .split(',');
    return tag;
};

function evaluate(data, funcOrKey) {
    switch (typeof funcOrKey) {
        case 'function':
            return funcOrKey.apply(this, arguments);
            break;
        case 'string':
            var keys = funcOrKey.split('.');
            var ans = data;
            keys.forEach(function(key, i) {
                ans = data[key];
            });
            return ans;
            break;
    }
}

module.exports = Renderer;
