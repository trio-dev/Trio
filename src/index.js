var Trio = {
    Factory: Factory,
    Service: Service,
    Component: ComponentManager,
    Vow: Vow,
    AJAX: {
        interceptAllRequest: function(cb) {
            GLOBAL_AJAX_REQUEST_INTERCEPT = cb;
        },
        interceptAllResponse: function(cb) {
            GLOBAL_AJAX_RESPONSE_INTERCEPT = cb;
        }
    },
    Stylizer: new Stylizer(),
    Renderer: new Renderer(),
    Module: new Module(),
    Resource: new ResourceManager(),
    VERSION: '0.1.2'
};

if (module && module.exports) {
    module.exports = Trio;
} else {
    window.Trio = Trio;
}
