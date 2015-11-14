describe('The Resource Class', function() {
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
    })
});
