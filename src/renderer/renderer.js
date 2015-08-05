var Renderer = function(){

};

Renderer.prototype.createTemplate = function() {
    return new Template();
};

var Template = function(){
    this._currentState = [];
    this._queue = [];
};

Template.prototype.open = function(tagName){
    tagName = parseTag(tagName);
    var fn = function() {
        var el = document.createElement(tagName[0]);
        if (tagName[1] === '.') {
            el.className = tagName[2];
        } else if (tagName[1] === '#') {
            el.id = tagName[2];
        }
        this._currentState.push(el);
    }.bind(this)
    this._queue.push(fn);
    return this;
};

Template.prototype.addClass = function(className) {
    var fn = function() {
        var el = grabLast.call(this);
        var separator = el.className.length > 0 ? ' ' : '';
        if (!hasClass(el,className)) {
            el.className += separator + className;
        }
    }.bind(this);
    this._queue.push(fn);
    return this;
};

Template.prototype.removeClass = function(className) {
    var fn = function() {
        var el = grabLast.call(this);
        if (hasClass(el,className)) {
            var reg = new RegExp('(\\s|^)'+className+'(\\s|$)');
            el.className = el.className.replace(reg,' ');
        }
    }.bind(this);
    this._queue.push(fn);
    return this;
};

Template.prototype.close = function() {
    var fn = function(d) {
        var el = this._currentState.pop();
        if (this._currentState.length === 0) {
            this.fragments.appendChild(el);
        } else {
            grabLast.call(this).appendChild(el);
        }
    }.bind(this);
    this._queue.push(fn);
    return this;
};

Template.prototype.if = function(cb) {

}

Template.prototype.render = function(data) {
    this.fragments = document.createDocumentFragment();
    this._queue.forEach(function(fn) {
        fn(data);
    }.bind(this));
    return this.fragments;
};

function grabLast() {
    return this._currentState[this._currentState.length - 1];
};

function hasClass(el, className) {
  return !!el.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
};

function parseTag(tag) {
    tag = tag.replace(/[.#]/, function(d) { return ',' + d + ','})
             .split(',');
    return tag;
};

module.exports = Renderer;
