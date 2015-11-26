(function() {
    var Vow = scope.Vow;
    //////////////////////////////////////////////////////
    /////////////////////// Module ///////////////////////
    //////////////////////////////////////////////////////
    // Module loaders to enable clean, modularized code

    // Storage to cache all loaded modules
    var MODULE_STORE = {};

    // Module Constructor
    var Module = function() {};

    // Export will invoke the function and cache its result at
    // MODULE_STORE using the passed-in key
    // 
    // Example:
    // Trio.Module.export('app', function() {
    //     return 'hi';
    // });
    // 
    // This will store 'hi' to MODULE_STORE.app
    Module.prototype.export = function(key, func) {
        if (typeof key !== 'string') {
            throw new Error('Module name is not a string.');
        }

        if (typeof func !== 'function') {
            throw new Error('Module is not a function.');
        }

        // Invoke func to get module value
        var module = func();

        // Store wrapped value in Storage
        // You can later on unwrapped value by doing:
        // 
        // MODULE_STORE[key](function(module) {
        //      console.log(module);
        // });
        // 
        // This is necessary as we need this to be unwrapped by 
        // the import promises resolve method in order to load 
        // each file in the correct order
        MODULE_STORE[key] = function(done) {
            done(module);
        };
    };


    // Import accept an object consist of { 'Module Name': 'URL or FILEPATH' },
    // and will perform the following:
    //   - If module name is in cache
    //      a. Resolve promise and pass in cache value to the promise callback
    //   - If module name is not in cache
    //      a. Load the URL (expecting a js file containing Trio.Module.export)
    //      b. On success, Trio.Module.export will cache the module value
    //      c. Return cached value
    //      
    //  Example:
    //  Trio.Module.import({
    //      'logo': '../src/js/logo.js'
    //  }).and.export('app', function(modules) {
    //      console.log(modules.logo);
    //  });
    //  
    //  This will log the return value from logo.js
    Module.prototype.import = function(modules) {
        // Grab list of modules key
        var count  = Object.keys(modules);

        // Create main promise
        var vow = Vow();

        // Values to be resolved
        var ret = {};

        var url;

        _import(count.pop(), vow);

        // Expose an and.export method for cleaner API when
        // importing and exporting modules.
        vow.promise.and = {};
        vow.promise.and.export = function(key, func) {
            var module;
            MODULE_STORE[key] = function(done) {
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

        // Sub routine for import
        function _import(key, promise) {
            var url = modules[key];

            if (typeof key !== 'string') {
                throw new Error('Module name is not a string.');
            }

            if (typeof url !== 'string') {
                throw new Error('URL is not a string.');
            }

            var module = MODULE_STORE[key];
            
            // If module is not already cached
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
                    MODULE_STORE[key](defer.resolve);
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

    Trio.Module = new Module();
})();
