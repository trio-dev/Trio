var gEventBus = new EventBus();

var Trio = {
    Factory: Factory,
    Service: Service,
    Component: Component,
    Vow: Vow,
    Stylizer: new Stylizer(),
    Renderer: new Renderer(),
    Module: new Module(),
    Resource: new Resource(),
    VERSION: '0.1.2'
};

Trio.registerGlobalEventBus = function(id) {
    return gEventBus.register(id);
};

if (module && module.exports) {
    module.exports = Trio;
} else {
    window.Trio = Trio;
}
