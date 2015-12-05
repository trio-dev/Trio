(function() {
    //////////////////////////////////////////////////////
    ////////////////////// Renderer //////////////////////
    //////////////////////////////////////////////////////
    /// Renderer is the rendering library for Trio. It 
    /// employs a set of simple API for user to create HTML.
    /// It also exposes a patch method to diff generated HTML
    /// and DOM incrementally, updating only what needs to be 
    /// update.

    var Renderer = function(){};

    Renderer.prototype.createTemplate = function() {
        return new Template();
    };

    Trio.Renderer = new Renderer();

    //////////////////////////////////////////////////////
    ////////////////////// Template //////////////////////
    //////////////////////////////////////////////////////
    /// Template object to store command and on render,
    /// return HTML

    var Template = function(){
        this._queue = [];
    };

    //////////////////////////////////////////////////////
    /////////////// DOM Templating methods ///////////////
    //////////////////////////////////////////////////////

    // Each of the methods below push a command object to a command queue.
    // The command queue will be executed by .render to create DOM fragments.
    Template.prototype.open         = queueCommand('openTag');
    Template.prototype.addClass     = queueCommand('addClass');
    Template.prototype.text         = queueCommand('text');
    Template.prototype.attr         = queueCommand('attribute');
    Template.prototype.style        = queueCommand('style');
    Template.prototype.data         = queueCommand('data');
    Template.prototype.doNotPatch   = queueCommand('doNotPatch');
    Template.prototype.close        = queueCommand('closeTag');
    Template.prototype.if           = queueCommand('if');
    Template.prototype.else         = queueCommand('else');
    Template.prototype.each         = queueCommand('loop');
    Template.prototype.done         = queueCommand('done');
    Template.prototype.xif          = Template.prototype.done; 
    Template.prototype.xeach        = Template.prototype.done;

    function queueCommand(commandName) {
        return function() {
            this._queue.push({
                action: commandName,
                detail: Array.prototype.slice.call(arguments)
            });
            return this;
        };
    }

    //////////////////////////////////////////////////////
    /////////////////////// Render ///////////////////////
    //////////////////////////////////////////////////////

    Template.prototype.render = function(data) {
        // Root element to store DOMs
        var root            = document.createDocumentFragment(),
        // Stacks to reference current context
            elements        = [];

        this.executeCommand(data, handleCommonActions);

        return root;

        function handleCommonActions(command, execData) {
            var el;
            switch (command.action) {
                case 'openTag':
                    elements.push(createTag.apply(null, command.detail));
                    break;
                case 'addClass':
                    el = getLastFrom(elements);
                    addClass.apply(el, [evaluate(execData, command.detail[0])]);
                    break;
                case 'style':
                    el = getLastFrom(elements);
                    addStyle.apply(el, [evaluate(execData, command.detail[0]), evaluate(execData, command.detail[1])]);
                    break;
                case 'attribute':
                    el = getLastFrom(elements);
                    addAttribute.apply(el, [evaluate(execData, command.detail[0]), evaluate(execData, command.detail[1])]);
                    break;
                case 'doNotPatch':
                    el = getLastFrom(elements);
                    addAttribute.call(el, 'data-do-not-patch', true);
                    break;
                case 'data':
                    el = getLastFrom(elements);
                    patchElement.apply(el, [evaluate(execData, command.detail[0])]);
                    break;
                case 'text':
                    el = getLastFrom(elements);
                    addText.apply(el, [evaluate(execData, command.detail[0])]);
                    break;
                case 'closeTag':
                    el = elements.pop();
                    if (elements.length === 0) {
                        root.appendChild(el);
                    } else {
                        getLastFrom(elements).appendChild(el);
                    }
                    break;
            }
        }
    };

    // Execute command is an iterator
    // Base on the data that was input, executeCommand will invoke callback in the right order
    // with the command object + data context
    Template.prototype.executeCommand = function(data, cb) {
        // Stacks to reference current context
        var conditionals    = [],
            loops           = [],
            states          = [],
        // Reference index for current execution
            execIndex       = 0,
            condition, loop;

        handleCommand.call(this, this._queue[execIndex], data);

        function handleCommand(command, execData) {
            // Grab current state: LOOP, CONDITIONAL, or undefined
            var state = getLastFrom(states);

            // Base case: exit if no command
            if (!command) {
                return;
            }

            // Change data in current execuation if in a loop
            // From [{a: 'a'}, {b: 'b'}, {c: 'c'}] to {a: 'a'}
            if (state === 'LOOP') {
                setDataContext();
            }

            // Handle IF, ELSE, EACH, or DONE
            // These methods change state of rendering
            handleStateActions();

            // Exit if condition is not met
            if ((state === 'CONDITIONAL' && !getLastFrom(conditionals)) || (state === 'LOOP' && !execData)) {
                handleCommand.call(this, this._queue[++execIndex], execData);
                return;
            }

            // Handle CREATE, APPEND, STYLE, ATTR, TEXT
            // These methods are purely rendering and do not change rendering state
            cb(command, execData);

            // Increment index for next execution
            execIndex++;

            // Execute next command
            handleCommand.call(this, this._queue[execIndex], execData);
            
            function setDataContext() {
                loop = getLastFrom(loops);
                execData = loop.data[loop.index];
            }

            function handleStateActions() {
                switch (command.action) {
                    case 'loop':
                        handleLoop();
                        break;
                    case 'done':
                        handleDone();
                        break;
                    case 'if':
                        handleIf();
                        break;
                    case 'else':
                        handleElse();
                        break;
                }
            }

            function handleLoop() {
                states.push('LOOP');
                loops.push({
                    data: evaluate(execData, command.detail[0]),
                    index: 0,
                    start: execIndex
                });
            }

            function handleDone() {
                states.pop();
                if (state === 'CONDITIONAL') {
                    conditionals.pop();
                } else if (state === 'LOOP') {
                    loop = getLastFrom(loops);
                    loop.index = loop.index + 1;
                    // If current loop is not done, set state back to loop
                    // and set next execution at start of loop
                    if (loop.index < loop.data.length) {
                        execIndex = loop.start;
                        states.push('LOOP');
                    } else {
                        loops.pop();
                    }
                }
            }

            function handleIf() {
                states.push('CONDITIONAL');
                condition = evaluate(execData, command.detail[0]);
                conditionals.push(condition);
            }

            function handleElse() {
                condition = !conditionals.pop();
                conditionals.push(condition);
            }
        }
    };

    //////////////////////////////////////////////////////
    /////////////////////// Patch ////////////////////////
    //////////////////////////////////////////////////////

    Template.prototype.patch = function(root, data) {
        var frag = this.render(data);

        _patch(root, frag);

        function _patch(from, to) {
            var fromNode, toNode;
            var length = Math.max(from.childNodes.length, to.childNodes.length);

            // Iterate over the longer children
            for (var i = 0; i < length; i++) {
                fromNode = from.childNodes[i];
                toNode   = to.childNodes[i];

                // If new DOM is shorter old DOM, trim old DOM
                if (!toNode && !!fromNode) {
                    removeAllAfter(from, i);
                    return;
                } else if (!fromNode && !!toNode) {
                    // If new DOM is longer than old DOM, insert new DOM
                    var clone = toNode.cloneNode(true);
                    from.appendChild(clone);
                    patchShadowRoot(clone, toNode);
                } else if (fromNode.tagName !== toNode.tagName) {
                    // Replace old with new if tag type is different
                    from.replaceChild(toNode.cloneNode(true), fromNode);
                } else {
                    // Patch node if no do-not-patch flag
                    if (fromNode.getAttribute && fromNode.getAttribute('data-do-not-patch')) return;
                    patchNode(fromNode, toNode);
                    _patch(fromNode, toNode);
                }
            }
        }

        function removeAllAfter(node, index) {
            for (var i = node.childNodes.length - 1; i >= index; i--) {
                node.childNodes[i].remove();
            }
        }

        function patchNode(from, to) {
            patchClass(from, to);
            patchStyle(from, to);
            patchAttributes(from, to);
            patchText(from, to);
            patchShadowRoot(from, to);
        }

        function patchClass(from, to) {
            var map;
            var toClasses   = to && to.className ? to.className.split(' ') : [];
            var fromClasses = from && from.className ? from.className.split(' ') : [];
            
            map = toClasses.reduce(function(accumulator, cls) {
                if (cls === '') {
                    return accumulator;
                }
                addClass.call(from, cls);
                accumulator[cls] = cls;
                return accumulator;
            }, {});

            fromClasses.forEach(function(cls) {
                if (!map[cls]) {
                    removeClass.call(from, cls);
                }
            });
        }

        function patchText(from, to) {
            if (from.nodeName === '#text' && to.nodeName === '#text') {
                if (from.textContent !== to.textContent) {
                    from.textContent = to.textContent;
                }
            }
        }

        function patchStyle(from, to) {
            var map = {};
            var styleKey, styleVal, fromKeys;

            if (to.style) {
                for (var i = 0; i < to.style.length; i++) {
                    styleKey = to.style[i];
                    styleVal = to.style[to.style[i]];
                    addStyle.call(from, styleKey, styleVal);
                    map[styleKey] = styleVal;
                }
            }

            if (from.style) {
                fromKeys = Array.prototype.slice.call(from.style);
                for (var j = 0; j < fromKeys.length; j++) {
                    styleKey = fromKeys[j];
                    if (!map[styleKey]) {
                        addStyle.call(from, styleKey, '');
                    }
                }
            }
        }

        function patchAttributes(from, to) {
            var map = {};
            var attr, attrKey, attrVal, fromKeys;

            if (to.attributes) {
                for (var i = 0; i < to.attributes.length; i++) {
                    attr = to.attributes[i];
                    attrKey = attr.name;
                    if (attrKey !== 'style' && attrKey !== 'class') {
                        from.setAttribute(attrKey, attr.value);
                        map[attrKey] = attr.value;                 
                    }
                }
            }

            if (from.attributes) {
                fromKeys = Array.prototype.slice.call(from.attributes);
                for (var j = 0; j < fromKeys.length; j++) {
                    attr = fromKeys[j];
                    attrKey = attr.name;
                    if (attrKey !== 'style' && attrKey !== 'class') {
                        if (!map[attrKey]) {
                            from.setAttribute(attrKey, '');
                        }
                    }
                }
            }
        }

        function patchShadowRoot(from, to) {
            if(from.shadowRoot && to.shadowRoot) {
                _patch(from.shadowRoot, to.shadowRoot);
            }
        }

    };

    //////////////////////////////////////////////////////
    /////////////////// Helper Methods ///////////////////
    //////////////////////////////////////////////////////

    function createTag(tag) {
        var tagName = parseTag(tag);
        var el      = document.createElement(tagName[0]);

        if (tagName[1] === '.') {
            el.className = tagName[2];
        } else if (tagName[1] === '#') {
            el.id = tagName[2];
        }

        return el;
    }

    function addClass(className) {
        var separator = this.className.length > 0 ? ' ' : '';
        className = typeof className === 'string' ? className : '';

        if (!hasClass(this, className)) {
            this.className += separator + className;
        }
    }

    function removeClass(className) {
        if (hasClass(this, className)) {
            var old = this.className;
            var out = old.replace(new RegExp('(\\s|^)' + className + '(\\s|$)'), ' ');
            this.className = out;
        }
    }

    function addStyle(attr, val) {
        if (this.style[attr] !== val) {
            this.style[attr] = val;
        }
    }

    function addAttribute(attr, val) {
        this.setAttribute(attr, typeof val === 'undefined' ? '' : val);
    }

    function addText(content) {
        this.textContent = content;
    }

    function patchElement(data) {
        if (data) {
            this.patch(data);
        }
    }

    function getLastFrom(array) {
        return array[array.length - 1];
    }

    function hasClass(el, className) {
      return !!el.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
    }

    function parseTag(tag) {
        tag = tag.replace(/[.#]/, function(d) { return ',' + d + ',';})
                 .split(',');
        return tag;
    }

    function isCustomElement(tag) {
        return !!tag.match('-');
    }

    function evaluate(data, funcOrVal) {
        switch (typeof funcOrVal) {
            case 'function':
                try {
                    return funcOrVal.call(data, data);
                } catch (e) {
                    return '';
                }
                break;
            default:
                return funcOrVal;

        }
    }
})();
