describe('The Factory Class', function() {
    var factory, messages;

    Trio.Resource.register({
        name: 'messages',
        cacheSize: 20
    });

    beforeEach(function() {
        var FactoryMaker = Trio.Factory.extend({
            initialize: function(opts) {
                this.sync('messages', function(msgs) {
                    this.attributes['1'] = msgs.get('1');
                });
            }
        });

        messages = Trio.Resource.get('messages');
        messages.set('1', 'Collaboratively administrate empowered markets via plug-and-play networks.');
        messages.set('2', 'Dynamically procrastinate B2C users after installed base benefits.');
        messages.set('3', 'Dramatically visualize customer directed convergence without revolutionary ROI.');
        messages.set('4', 'Efficiently unleash cross-media information without cross-media value.');
        messages.set('5', 'Quickly maximize timely deliverables for real-time schemas.');
        
        factory = new FactoryMaker({});
    });

    it('should be able to sync with resources', function() {
        expect(factory.attributes['1']).toBe('Collaboratively administrate empowered markets via plug-and-play networks.');
        messages.set('1', 'Changed to this');
        messages.hasBeenUpdated();
        expect(factory.attributes['1']).toBe('Changed to this');
    });
});
