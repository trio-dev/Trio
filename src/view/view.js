var EventBus = require('../eventBus/eventBus');
var Stylizer = require('../stylizer/stylizer');
var IdGenerator = require('../helpers/IdGenerator')('view');
var View = {};

View._constructor = function(opts) {
    this._initialize(opts);
};

View._constructor.prototype._initialize = function(opts) {
    var template = this.template;
    var style = this.style;

    this.id = IdGenerator();
    this.refIndex = {};

    this.eventBus = opts.eventBus || new EventBus();
    this.eventBus.register(this.id);

    if (style) {
        this.style = Stylizer.stringify(style);
    }

    if (template) {
        this.template = this.renderTemplate(template);
    }

    if (typeof this.initialize === 'function') {
        this.initialize.apply(this, arguments);
    }
};

View._constructor.prototype.renderTemplate = function(template) {
    var el, style;

    el = document.createDocumentFragment();

    style = document.createElement('style');
    style.innerText = this.style;
    el.appendChild(style);

    createElements.call(this, template, el);

    return el;

    function createElements(template, base) {
        for (var tag in template) {
            if (isValidTag(tag)) {
                var el = createOneElement.call(this, tag);
                base.appendChild(el);
                createElements.call(this, template[tag], el);
            }

            if (tag === 'ref') {
                this.refIndex[template[tag]] = base;
            }

            if (tag === 'onClick') {
                addEvents.call(this, base, 'click' ,template[tag]);
            }
        }
    }

    function createOneElement(tag) {
        var parsed = parseTag(tag);
        var tagName = parsed[0];

        var el = document.createElement(tagName);

        if (parsed[1] === '.') {
            el.className = parsed[2];
        } else if (parsed[1] === '#') {
            el.id = parsed[2];
        }

        return el;
    }

    function addEvents(el, originEvt, newEvt) {
        el.addEventListener(originEvt, function(e) {
            this.eventBus.publish(newEvt, this, e);
        }.bind(this));
    }

    function parseTag(tag) {
        tag = tag.replace(/[.#]/, function(d) { return ',' + d + ','})
                 .split(',');
        return tag;
    }

    function isValidTag(tag) {
        tag = tag.replace(/[.#]/, function(d) { return ',' + d + ','})
                 .split(',');
        return (tag[1] === '#' || tag[1] === '.') && tag.length === 3;
    }
};

View._constructor.prototype.appendComponentTo = function(parent) {
    var Root, root, clone;
    var proto = Object.create(HTMLElement.prototype);
    
    Root = document.registerElement(this.tagName, {
        prototype: proto
    });

    root = new Root()

    parent.appendChild(root);
    this.root = root.createShadowRoot();
    this.root.appendChild(this.template);
};

View._constructor.prototype.addClass = function(el, className) {
    if (!this.hasClass(el,className)) {
        el.className += " " + className;
    }
};

View._constructor.prototype.removeClass = function(el, className) {
    if (this.hasClass(el,className)) {
        var reg = new RegExp('(\\s|^)'+className+'(\\s|$)');
        el.className = el.className.replace(reg,' ');
    }
};

View._constructor.prototype.hasClass = function(el, className) {
  return !!el.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
};

View._constructor.prototype.destroy = function() {
    this.el.remove();
    this.el = null;
    this.refIndex = {};
    this.eventBus.unsubscribeAll();
};

module.exports = View;
