var Factory = require('./factory/factory');
var Service = require('./service/service');
var Component = require('./component/component');
var Stylizer = require('./stylizer/stylizer');
var EventBus = require('./eventBus/eventBus');
var Module = require('./module/module');
var Resource = require('./resource/resource');
var Renderer = require('./renderer/renderer');
var Vow = require('./vow/vow');

var gEventBus = new EventBus();;

var Trio = {
    Factory: Factory,
    Service: Service,
    Component: Component,
    Vow: Vow,
    Stylizer: new Stylizer(),
    Renderer: new Renderer(),
    Module: new Module(),
    Resource: new Resource()
}

Trio.registerGlobalEventBus = function(id) {
    return gEventBus.register(id);
};

module.exports = Trio;
