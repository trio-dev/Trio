describe('The Signal Class', function() {
    describe('One Signal', function() {
        var instance1 = {},
            instance2 = {},
            signalOne, signalTwo,
            handler = jasmine.createSpy('handler'), 
            handler2 = jasmine.createSpy('handler2');

        beforeEach(function() {
            new Signal('instance1', instance1);
            new Signal('instance2', instance2);
            handler.calls.reset();
            handler2.calls.reset();
        });

        it('should add on, emit, off, and reset on instantiation', function() {
            expect(typeof instance1.on).toBe('function');
            expect(typeof instance1.off).toBe('function');
            expect(typeof instance1.emit).toBe('function');
            expect(typeof instance1.reset).toBe('function');
        });

        it('should not respond own event', function() {
            var args    = {foo: 'bar'};
            instance1.on('test', handler);
            instance1.on('test', handler2);
            instance1.emit('test', args);

            expect(handler).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        it('should not invoke fallback handler', function() {
            var args    = {foo: 'bar'};
            instance1.on(handler);
            instance1.emit('test', args);

            expect(handler).not.toHaveBeenCalled();
        });

        it('should throw an error when trying to listen without callback', function() {
            expect(instance1.on.bind(this, 'test')).toThrow();
        });

    });

    describe('Multiple Signal', function() {
        var instance1 = {},
            instance2 = {},
            signalOne, signalTwo,
            handler = jasmine.createSpy('handler'), 
            handler2 = jasmine.createSpy('handler2');

        beforeEach(function() {
            signalOne = new Signal('instance1', instance1);
            signalTwo = new Signal('instance2', instance2);
            handler.calls.reset();
            handler2.calls.reset();
        });

        it('should be able to connect with other signals', function() {
            instance1.connect('instance2');
            expect(signalOne.connectors.instance2).toBe(signalTwo);
            expect(signalTwo.connectors.instance1).toBe(signalOne);
        });

        it('should throw error when signal cannot be located', function() {
            expect(instance1.connect.bind(instance1, 'no instance')).toThrow();
        });

        it('connected signals should be able to talk to each other', function() {
            instance1.connect('instance2');
            instance2.on('test', handler);
            instance1.emit('test', null);
            expect(handler).toHaveBeenCalledWith({
                type: 'test',
                detail: null,
                origin: instance1
            });
        });

        it('should be able to off an event', function() {
            instance1.connect('instance2');
            instance2.on('test', handler);
            instance1.emit('test', null);

            expect(handler).toHaveBeenCalledWith({
                type: 'test',
                detail: null,
                origin: instance1
            });

            handler.calls.reset();
            instance2.off('test', handler);
            instance1.emit('test', null);

            expect(handler).not.toHaveBeenCalled();
        });

        it('should be able to reset event', function() {
            instance1.connect('instance2');
            instance2.on('test', handler);
            instance2.on('test2', handler);
            instance2.on('test3', handler2);

            instance2.reset('test');
            instance1.emit('test', null);

            expect(handler).not.toHaveBeenCalled();

            instance2.reset();
            instance1.emit('test2', null);
            instance1.emit('test3', null);
            expect(handler).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        it('should not listen to pulse from disconnected signal', function() {
            instance1.connect('instance2');
            instance2.on('test', handler);
            instance2.disconnect('instance1');
            instance1.emit('test', null);
            expect(handler).not.toHaveBeenCalled();
        });

        it('should listen to broadcast pulse even if not connected', function() {
            instance2.on('test', handler);
            instance1.broadcast('test', null);
            expect(handler).toHaveBeenCalledWith({
                type: 'test',
                detail: null,
                origin: instance1
            });
        });
    });
});
