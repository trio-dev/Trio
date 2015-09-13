var promiseTests = require("promises-aplus-tests-phantom");

describe('Vow', function() {
    var vow = Vow();
    
    describe('basics', function() {
        var vow;
        beforeEach(function() {
            vow = Vow();
        });

        it('should create an defer object', function() {
            expect(typeof vow.resolve).toBe('function');
            expect(typeof vow.reject).toBe('function');
            expect(typeof vow.promise).toBe('object');
            expect(typeof vow.promise.then).toBe('function');
            expect(typeof vow.promise.catch).toBe('function');
            expect(typeof vow.promise.done).toBe('function');
        });

        it('should pass return values to next thenable as input parameter', function() {
            var d = vow.promise;
            var n = 0;

            d.then(plusOne)
             .then(plusOne)
             .then(plusOne)
             .then(plusOne);

            vow.resolve(n);

            expect(n).toBe(4);
            
            function plusOne(num) {
                n = num + 1;
                return n;
            }
        });

        it('would swallow errors', function() {
            var d = vow.promise;

            d.then(function() { throw new Error('test'); });

            expect(vow.resolve).not.toThrow();
        });

        xit('should handle reject with catch', function() {
            var d = vow.promise;
            var error = null;
            var ans = null;

            d.then(function() { ans = 'then'})
             .catch(function(err) { ans = err; })

            vow.reject('catch');

            expect(ans).toBe('catch');
        });

        it('should catch error from previous thenable and continue promises execution', function() {
            var d = vow.promise;
            var error = null;
            var ans = null;

            d.then(function() { throw new Error('test'); })
             .catch(function(err) { error = err; return 1; })
             .then(function(d) { ans = d; });

            vow.resolve();

            expect(ans).toBe(1);
            expect(error.message).toBe('test');
        });

        it('should throw unhandled error on done', function() {
            var d = vow.promise;

            d.then(function() { throw new Error('test'); })
             .done();

            expect(vow.resolve).toThrow();
        });
    });

    xdescribe('Promises-A+-Tests', function() {
        promiseTests.mocha(vow);
    });
});
