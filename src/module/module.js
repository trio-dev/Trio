var moduleStore = {};

var Module = function() {};

Module.prototype.export = function(key, func) {
    if (typeof key !== 'string') {
        throw new Error('Module name is not a string.');
    }

    if (typeof func !== 'function') {
        throw new Error('Module is not a function.');
    }

    var module = func();

    moduleStore[key] = function(done) {
        done(module);
    };
};

Module.prototype.import = function(modules) {
    var count  = Object.keys(modules);
    var vow = Vow();
    var ret = {};
    var url;

    _import(count.pop(), vow);

    vow.promise.and = {};
    vow.promise.and.export = function(key, func) {
        var module;
        moduleStore[key] = function(done) {
            if (module) {
                done(module);
                return;
            }

            vow.promise
                .then(function(ret) {
                    module = func.call(this, ret);
                    return module;
                }.bind(this))
                .done(done);
        };
    }.bind(this);

    vow.promise.and.import = function(modules) {
        return vow.promise.then(this.import.bind(this, modules));
    }.bind(this);

    return vow.promise;

    function _import(key, promise) {
        var url = modules[key];

        if (typeof key !== 'string') {
            throw new Error('Module name is not a string.');
        }

        if (typeof url !== 'string') {
            throw new Error('URL is not a string.');
        }

        var module = moduleStore[key];
        
        if (!module) {
            var script = document.createElement('script');

            script.type = "text/javascript";
            script.src = url;
            script.onload = function() {
                var defer = Vow();

                console.log('Loading ' + key + '...');

                defer.promise.then(function(data) {
                    ret[key] = data;
                    if (count.length === 0) {
                        promise.resolve(ret);
                    } else {
                        _import(count.pop(), promise);
                    }
                });

                script.remove();
                moduleStore[key](defer.resolve);
            }.bind(this, key);

            document.body.appendChild(script);
        } else {
            module(function(data) {
                ret[key] = data;
                if (count.length === 0) {
                    promise.resolve(ret);
                } else {
                    _import(count.pop(), promise);
                }
            });
        }
    }
};
