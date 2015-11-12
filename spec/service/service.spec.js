describe('The Service Class', function() {
    var ChildService = Trio.Service.extend({});
    var ServiceMaker;
    var mainService;
    var childServiceOne;
    var childServiceTwo;

    beforeEach(function() {
        ServiceMaker = Trio.Service.extend({
            onReady: function(){
                childServiceOne = new ChildService();
                childServiceTwo = new ChildService();
                this.implement(childServiceOne);
                this.implement(childServiceTwo);
            },
            onStart: function(){

            },
            onStop: function(){

            }
        });

        spyOn(ServiceMaker.prototype, 'onReady').and.callThrough();
        spyOn(ServiceMaker.prototype, 'onStart').and.callThrough();
        spyOn(ServiceMaker.prototype, 'onStop').and.callThrough();

        mainService = new ServiceMaker('test');
    });

    it('should assign uuid to service instance', function() {
        expect(mainService.uuid).toContain('service');
    });

    it('should invoke onReady', function() {
        expect(ServiceMaker.prototype.onReady).toHaveBeenCalledWith('test')
    });

    it('should invoke onStart when starting service', function() {
        expect(ServiceMaker.prototype.onStart).not.toHaveBeenCalled();
        mainService.start('test start');
        expect(ServiceMaker.prototype.onStart).toHaveBeenCalledWith('test start');
    });

    it('should be able to connect to implemented instances', function() {
        mainService.start('test start');
        var handlerOne = jasmine.createSpy('handlerOne'); 
        var handlerTwo = jasmine.createSpy('handlerTwo');
        childServiceOne.on(handlerOne);
        childServiceTwo.on(handlerTwo);

        childServiceOne.emit('testing', {foo: 'bar'});
        expect(handlerTwo).toHaveBeenCalledWith({
            type: 'testing',
            detail: {foo: 'bar'},
            origin: childServiceOne
        });
    });

    it('should invoke onStop when stopping service', function() {
        expect(ServiceMaker.prototype.onStop).not.toHaveBeenCalled();
        mainService.start('test start');
        mainService.stop('test stop');
        expect(ServiceMaker.prototype.onStop).toHaveBeenCalledWith('test stop');
    });

    it('should reset signals after stopping service', function() {
        mainService.start('test start');
        var handlerOne = jasmine.createSpy('handlerOne'); 
        var handlerTwo = jasmine.createSpy('handlerTwo');
        childServiceOne.on(handlerOne);
        childServiceTwo.on(handlerTwo);

        childServiceOne.emit('testing', {foo: 'bar'});
        expect(handlerTwo).toHaveBeenCalledWith({
            type: 'testing',
            detail: {foo: 'bar'},
            origin: childServiceOne
        });

        mainService.stop();
        handlerTwo.calls.reset();
        childServiceOne.emit('testing', {foo: 'bar'});
        expect(handlerTwo).not.toHaveBeenCalled();
    });
});
