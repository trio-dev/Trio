describe('The Component Class', function() {
    var c, frag, style, tmpl;

    beforeEach(function() {
        setupTestElement();
    });

    it('should register custom element', function() {
        var el = document.createElement('test-container');
        document.body.appendChild(el);
        expect(el.outerHTML).toBe('<test-container></test-container>');
    });

    it('should invoke onCreate on element create', function() {
        var el = document.createElement('test-container');
        expect(el.spinner.outerHTML).toBe('<div class="spinner pie"></div>');
    });

    it('should add event listeners on element attach', function(done) {
        var el = document.createElement('test-container');
        document.body.appendChild(el);
        spyOn(el, 'clickSpinner');
        el.spinner.addEventListener('click', el.clickSpinner);
        el.spinner.click();
        expect(el.clickSpinner).toHaveBeenCalled();
        done();
    });

    it('should extend from existing custom element', function() {
        var fn = jasmine.createSpy('spy')
        var c2 = Component.extend('test-container', {
            tagName: 'extend-test-container',
            onCreate: fn
        });
        var el = document.createElement('extend-test-container');
        document.body.appendChild(el);
        expect(el.spinner.outerHTML).toBe('<div class="spinner pie"></div>');
        expect(fn).toHaveBeenCalled();
    });
});

function setupTestElement() {
    var styleOpts = {};
    
    tmpl = Trio.Renderer.createTemplate();

    tmpl.create('div.pie-wrapper')
        .create('div.spinner').addClass('pie').append()
    .appendLast()

    frag = tmpl.render();

    style = Trio.Stylizer.createStyleTag(styleOpts);

    c = Component.register({
        tagName: 'test-container',
        fragment: frag,
        style: style,
        events: {
            'click .spinner': 'clickSpinner'
        },
        onCreate: function() {
            this.spinner = this.shadowRoot.querySelector('.spinner');
        },
        clickSpinner: function() {

        }
    })
}
