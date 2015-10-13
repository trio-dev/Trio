var Renderer = function(){};

Renderer.prototype.createTemplate = function() {
    return new Template();
};

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
Template.prototype.removeClass  = queueCommand('removeClass');
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
    var root   = document.createDocumentFragment(),
    // Stacks to reference current context
        elements = [],
        conditionals = [],
        loops = [],
        states = [],
    // Reference index for current execution
        execIndex = 0,
        el, condition, loop;

    handleCommand.call(this, this._queue[execIndex], data);

    return root;

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
        if (state === 'CONDITIONAL' && !getLastFrom(conditionals)) {
            handleCommand.call(this, this._queue[++execIndex], execData);
            return;
        }

        // Handle CREATE, APPEND, STYLE, ATTR, TEXT
        // These methods are purely rendering and do not change rendering state
        handleCommonActions();


        // Increment index for next execution
        execIndex++;

        // Execute next command
        handleCommand.call(this, this._queue[execIndex], execData);
        
        function setDataContext() {
            loop = getLastFrom(loops);
            execData = loop.data[loop.index];
        }

        function handleStateActions() {
            if (command.action === 'loop') {
                handleLoop();
            }

            if (command.action === 'done') {
                handleDone();
            }
            
            if (command.action === 'if') {
                handleIf();
            }

            if (command.action === 'else') {
                handleElse();
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

        function handleCommonActions() {
            switch (command.action) {
                case 'openTag':
                    elements.push(createTag.apply(null, command.detail));
                    break;
                case 'addClass':
                    el = getLastFrom(elements);
                    addClass.apply(el, [evaluate(execData, command.detail[0])]);
                    break;
                case 'removeClass':
                    el = getLastFrom(elements);
                    removeClass.apply(el, [evaluate(execData, command.detail[0])]);
                    break;
                case 'style':
                    el = getLastFrom(elements);
                    addStyle.apply(el, [evaluate(execData, command.detail[0]), evaluate(execData, command.detail[1])]);
                    break;
                case 'attribute':
                    el = getLastFrom(elements);
                    addAttribute.apply(el, [evaluate(execData, command.detail[0]), evaluate(execData, command.detail[1])]);
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

    if (!hasClass(this, className)) {
        this.className += separator + className;
    }
}

function removeClass(className) {
    if (hasClass(this,className)) {
        this.className = this.className.replace(new RegExp('(\\s|^)'+className+'(\\s|$)'), ' ');
    }
}

function addStyle(attr, val) {
    this.style[attr] = val;
}

function addAttribute(attr, val) {
    this.setAttribute(attr, val);
}

function addText(content) {
    this.textContent = content;
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

function evaluate(data, funcOrVal) {
    switch (typeof funcOrVal) {
        case 'function':
            return funcOrVal.call(this, data);
        case 'string':
            return funcOrVal;
        case 'object':
            return funcOrVal;
    }
}
