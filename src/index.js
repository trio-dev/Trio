var Factory = require('./factory/factory');
var Service = require('./service/service');
var View = require('./view/view');
var Stylizer = require('./stylizer/stylizer');
var EventBus = require('./eventBus/eventBus');
var Module = require('./module/module');
var Resource = require('./resource/resource');
var Vow = require('./vow/vow');

var gEventBus = new EventBus();;

var Trio = {
    Factory: Factory,
    Service: Service,
    View: View,
    Vow: Vow,
    Stylizer: new Stylizer(),
    Module: new Module(),
    Resource: new Resource()
}

Trio.registerGlobalEventBus = function(id) {
    return gEventBus.register(id);
};

module.exports = Trio;
