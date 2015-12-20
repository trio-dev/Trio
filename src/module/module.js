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
    // MODULE_STORE using filepath
    // 
    // Example:
    // Trio.Module.export(function() {
    //     return 'hi';
    // });
    // 
    // This will store a wrapped function that resolve 'hi' to MODULE_STORE[filepath]
    Module.prototype.export = function() {
        var func, url;
        if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
            func = arguments[1];
            url  = arguments[0];
        } else {
            func = arguments[0];
        }

        if (typeof func !== 'function') {
            throw new Error('Module is not a function.');
        }

        // Invoke func to get module value
        var module = func();
        var filepath = getFilepath(url);

        // Store wrapped value in Storage
        // You can later on unwrapped value by doing:
        // 
        // MODULE_STORE[filepath](function(module) {
        //      console.log(module);
        // });
        // 
        // This is necessary as we need this to be unwrapped by 
        // the import promises resolve method in order to load 
        // each file in the correct order
        MODULE_STORE[filepath] = function(done) {
            done(module);
        };


    };


    // Import accept an array consist of ['Filepath']
    // and will perform the following:
    //   - If module is in cache
    //      a. Resolve promise and pass in cache value to the promise callback
    //   - If module is not in cache
    //      a. Load the URL (expecting a js file containing Trio.Module.export)
    //      b. On success, Trio.Module.export will cache the module value
    //      c. Return cached value
    //      
    //  Example:
    //  Trio.Module.import([
    //      '../src/js/logo.js'
    //  ]).and.export('app', function(logo) {
    //      console.log(logo);
    //  });
    //  
    //  This will log the return value from logo.js
    Module.prototype.import = function(modules) {
        var i  = 0;

        // Create main promise
        var vow = Vow();

        _import(modules[i], [], vow);

        // Expose an and.export method for cleaner API when
        // importing and exporting modules.
        vow.promise.and = {};
        vow.promise.and.export = function() {
            var func, url;

            if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
                func = arguments[1];
                url  = arguments[0];
            } else {
                func = arguments[0];
            }

            var module;
            var filepath = getFilepath(url);
            MODULE_STORE[filepath] = function(done) {
                if (module) {
                    done(module);
                    return;
                }

                vow.promise
                    .then(function(ret) {
                        module = func.apply(this, ret);
                        return module;
                    }.bind(this))
                    .done(done);
            };
        }.bind(this);

        vow.promise.and.then = function() {
            var func, url, module;

            if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
                func = arguments[1];
                url  = arguments[0];
            } else {
                func = arguments[0];
            }

            vow.promise
                .then(function(ret) {
                    module = func.apply(this, ret);
                    return module;
                }.bind(this))
                .done();
        }.bind(this);

        return vow.promise;

        // Sub routine for import
        function _import(relativeUrl, returnObject, promise) {
            var script, filepath, module;

            if (MODULE_STORE[relativeUrl]) {
                module = MODULE_STORE[relativeUrl];
            } else {
                // Create script tag
                script   = makeScript(relativeUrl);
                filepath = script.src;

                // See if module is already cached
                module   = MODULE_STORE[script.src];
            }

            // If module is not already cached
            if (!module) {
                script.onload = function() {
                    var defer = Vow();

                    console.log('Loading ' + filepath + '...');

                    defer.promise.then(loadNextOrResolve(returnObject, promise));

                    script.remove();
                    MODULE_STORE[filepath](defer.resolve);
                };

                document.body.appendChild(script);
            } else {
                module(loadNextOrResolve(returnObject, promise));
            }
        }

        // Make a script tag given a filepath
        function makeScript(url) {
            if (typeof url !== 'string') {
                throw new Error('Filepath is not a string.');
            }

            var script = document.createElement('script');
            script.type = "text/javascript";
            script.src = url;
            return script;
        }

        //  Load next module, or resolve promise if all modules are loaded
        function loadNextOrResolve(returnObject, promise) {
            return function(data) {
                returnObject.push(data);
                i++;
                if (i >= modules.length) {
                    promise.resolve(returnObject);
                } else {
                    _import(modules[i], returnObject, promise);
                }
            };
        }
    };

    Trio.Module = new Module();

    function getFilepath(url) {
        if (url && typeof url === 'string') {
            return url;
        }

        if (document && document.currentScript) {
            return document.currentScript.src;
        }

        throw new Error('Error getting current filepath.');
    }

})();
