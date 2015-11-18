describe('The Component Class', function() {
    var c, frag, style, tmpl;

    beforeEach(function() {
        setupTestElement();
    });

    it('should register custom element', function() {
        var el = document.createElement('test-container');
        document.body.appendChild(el);
        expect(el.outerHTML).toBe('<test-container></test-container>');
        expect(el.shadowRoot.innerHTML).toBe('<style>div.test{display:block}</style><div class="pie-wrapper"><div class="spinner pie"></div></div>');
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
    tmpl = Trio.Renderer.createTemplate();
    style = Trio.Stylizer.create();
    style.select('div.test')
            .css('display', 'block');

    tmpl.open('style').text(style.toCSS.bind(style)).close()
        .open('div.pie-wrapper')
            .open('div.spinner').addClass('pie').close()
        .close()

    frag = tmpl.render();


    c = Component.register({
        tagName: 'test-container',
        fragment: frag,
        // events: {
        //     'click .spinner': 'clickSpinner'
        // },
        onCreate: function() {
            this.spinner = this.shadowRoot.querySelector('.spinner');
        },
        clickSpinner: function() {

        }
    })
}
