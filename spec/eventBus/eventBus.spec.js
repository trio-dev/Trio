describe('The EventBus Class', function(done) {
    describe('The register method', function() {
        var e, ctx;
        beforeEach(function() {
            e   = new EventBus();
            ctx = e.register('testId');
        });
        it('should return subscribe, publish, unsubscribe, and unsubscribeAll', function() {
            expect(typeof ctx.subscribe).toBe('function');
            expect(typeof ctx.publish).toBe('function');
            expect(typeof ctx.unsubscribe).toBe('function');
            expect(typeof ctx.unsubscribeAll).toBe('function');
        });
    });
});
