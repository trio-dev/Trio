describe('The EventBus Class', function(done) {
    describe('One EventBus', function() {
        var e, eb, 
            handler = jasmine.createSpy('handler'), 
            handler2 = jasmine.createSpy('handler2');

        beforeEach(function() {
            e   = new EventBus();
            eb  = e.register('testId');
            handler.calls.reset();
            handler2.calls.reset();
        });

        it('should return subscribe, publish, unsubscribe, and unsubscribeAll on register', function() {
            expect(typeof eb.subscribe).toBe('function');
            expect(typeof eb.publish).toBe('function');
            expect(typeof eb.unsubscribe).toBe('function');
            expect(typeof eb.unsubscribeAll).toBe('function');
        });

        it('should be able to subscribe to event', function() {
            var ctx     = {};
            var args    = {foo: 'bar'};
            eb.subscribe('test', handler);
            eb.subscribe('test', handler2);
            eb.publish('test', ctx, args);

            expect(handler).toHaveBeenCalledWith(ctx, args);
            expect(handler2).toHaveBeenCalledWith(ctx, args);
        });

        it('should be able to unsubscribe to event', function() {
            eb.subscribe('test', handler);
            eb.unsubscribe('test', handler);
            eb.publish('test', null, null);

            expect(handler).not.toHaveBeenCalled();
        });

        it('should be able to unsubscribeAll event', function() {
            eb.subscribe('test', handler);
            eb.subscribe('test', handler2);
            eb.subscribe('test2', handler);
            eb.subscribe('test3', handler2);

            eb.unsubscribeAll('test');
            eb.publish('test', null, null);

            expect(handler).not.toHaveBeenCalled();

            eb.unsubscribeAll();
            expect(handler).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });
});
