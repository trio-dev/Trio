describe('Vow', function() {
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
    });
});
