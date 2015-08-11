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

window.Trio = Trio;
