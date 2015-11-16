describe('The Resource Class', function() {
    describe('sendRequest method', function() {
        beforeEach(function() {
            Trio.AJAX.interceptAllRequest(function(req) {
                req.setHeader("X-Parse-REST-API-Key", 'N13rdzgEnxRt9ckcnGDWQncMF8IdvlKyiQsTuIv5');
                req.setHeader("X-Parse-Application-Id", 'BLnExPvX7WKmiMjjzs8U92ulSFSGJlGZlg2WWKQg');
            });

            Trio.AJAX.interceptAllResponse(function(res) {
                return JSON.parse(res.responseText);
            });
        });
        
        it('should interceptAllRequest and interceptAllResponse', function(done) {
            Trio.Resource.register({
                name: 'test'
            });

            var test = Trio.Resource.get('test');

            test.sendRequest({
                type: 'get',
                url: 'https://api.parse.com/1/classes/players'
            }, function(res) {
                expect(Array.isArray(res.results)).toBe(true);
                done();
            })
        });

        it('should interceptRequest and interceptResponse', function(done) {
            Trio.Resource.register({
                name: 'testOne',
                interceptRequest: function(req) {
                    req.setUrl('https://api.parse.com/1/classes/players');
                },
                interceptResponse: function(res) {
                    return res.results[0];
                }
            });

            var test = Trio.Resource.get('testOne');

            test.sendRequest({
                type: 'get',
                url: 'wrong url'
            }, function(res) {
                expect(res.firstName).toBe('LeBron');
                done();
            })
        });
    });

    describe('LruCache', function() {
        Trio.Resource.register({
            name: 'testCache',
            cacheSize: 5
        });

        it('should be able to set and get from cache', function() {
            var resource = Trio.Resource.get('testCache');
            resource.set('one', 1);
            resource.set('two', 2);
            resource.set('three', 3);
            expect(resource.get('one')).toBe(1);
            expect(resource.get('two')).toBe(2);
            expect(resource.get('three')).toBe(3);
        });

        it('should remove one from cache when exceed max size', function() {
            var resource = Trio.Resource.get('testCache');
            resource.set('one', 1);
            resource.set('two', 2);
            resource.set('three', 3);
            resource.set('four', 4);
            resource.set('five', 5);
            resource.set('six', 6);
            expect(resource.get('one')).toBe(null);
            expect(resource.get('two')).toBe(2);
            expect(resource.get('three')).toBe(3);
            expect(resource.get('four')).toBe(4);
            expect(resource.get('five')).toBe(5);
            expect(resource.get('six')).toBe(6);
        });
    });

    describe('Basic use case', function() {
        var useCaseTest;

        Trio.AJAX.interceptAllRequest(function(req) {
            req.setHeader("X-Parse-REST-API-Key", 'N13rdzgEnxRt9ckcnGDWQncMF8IdvlKyiQsTuIv5');
            req.setHeader("X-Parse-Application-Id", 'BLnExPvX7WKmiMjjzs8U92ulSFSGJlGZlg2WWKQg');
        });

        Trio.AJAX.interceptAllResponse(function(res) {
            return JSON.parse(res.responseText);
        });

        Trio.Resource.register({
            name: 'useTest',
            cacheSize: 2,
            fetchUser: function(firstName, callback) {
                var cache = this.get(firstName);

                if (cache) {
                    callback(cache);
                    return;
                }

                this.sendRequest({
                    type: 'get',
                    url: 'https://api.parse.com/1/classes/players?' + encode(firstName)
                }, function(res) {
                    var player = res.results[0];
                    this.set(player.firstName, player);
                    callback(player);
                }.bind(this))

                function encode(firstName) {
                    return 'where={"firstName":"' + firstName + '"}';
                }
            }
        });

        beforeEach(function() {
            useCaseTest = Trio.Resource.get('useTest');
            spyOn(useCaseTest, 'sendRequest').and.callThrough();
        });

        it('should fetch user', function(done) {
            useCaseTest.fetchUser('LeBron', function(res) {
                expect(res.firstName).toBe('LeBron');
                done();
            });
        });

        it('should not fetch user in cache', function(done) {
            useCaseTest.sendRequest.calls.reset();
            useCaseTest.fetchUser('LeBron', function(res) {
                expect(res.firstName).toBe('LeBron');
                expect(useCaseTest.sendRequest).not.toHaveBeenCalled();
                done();
            });
        });

        it('should drop least recently user user when cache exceed limit', function(done) {
            useCaseTest.fetchUser('Kyrie', function(res) {
                expect(res.firstName).toBe('Kyrie');

                useCaseTest.fetchUser('Kevin', function(res) {
                    expect(res.firstName).toBe('Kevin');
                    useCaseTest.sendRequest.calls.reset();

                    useCaseTest.fetchUser('LeBron', function(res) {
                        expect(res.firstName).toBe('LeBron');
                        expect(useCaseTest.sendRequest).toHaveBeenCalled();
                        done();
                    });
                });
            });
        });
    });
});



