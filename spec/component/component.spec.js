describe('The Component Class', function() {
    var c, frag, style, tmpl;

    beforeEach(function() {
        style = Trio.Stylizer.create();
        style.select('div.pie-wrapper')
                .css('background-color', 'black')
            .select('div.spinner')
                .css('background-color', 'white');

        tmpl = Trio.Renderer.createTemplate();
        tmpl.open('style').text(style.toCSS.bind(style)).close()
            .open('div.pie-wrapper')
                .text(function(d) { return d.content; })
                .open('div.spinner').addClass(function(d) { return d.className; }).close()
            .close();


        c = Component.register({
            tagName: 'test-container',
            template: tmpl,
            onChange: function(attr, oldVal, newVal){
                this.trio[attr] = newVal;
            },
            onAttach: function(){
                this.trio.patch({
                    content: 'test',
                    className: 'test-test'
                });
            },
            onCreate: function(){
                this.spinner = this.shadowRoot.querySelector('.spinner');
            },
            onDetach: function(){
                this.trio.detached = true;
            },
            clickSpinner: function() {}
        })
    });

    it('should have a trio object', function() {
        var el = document.createElement('test-container');
        expect(typeof el.trio).toBe('object');
        expect(typeof el.trio.uuid).toBe('string');
        expect(el.trio.tagName).toBe('test-container');
        expect(typeof el.trio.clickSpinner).toBe('function');
        expect(typeof el.trio.on).toBe('function');
        expect(typeof el.trio.off).toBe('function');
        expect(typeof el.trio.emit).toBe('function');
        expect(typeof el.trio.broadcast).toBe('function');
        expect(typeof el.trio.render).toBe('function');
        expect(typeof el.trio.patch).toBe('function');
    });

    it('should register custom element', function() {
        var el = document.createElement('test-container');
        expect(el.outerHTML).toBe('<test-container></test-container>');
        expect(el.shadowRoot.innerHTML).toBe('<style>div.pie-wrapper{background-color:black}div.spinner{background-color:white}</style><div class="pie-wrapper"><div class="spinner "></div></div>');
    });

    it('should invoke onCreate on element create', function() {
        var el = document.createElement('test-container');
        expect(el.spinner.outerHTML).toBe('<div class="spinner "></div>');
    });

    it('should invoke onAttach on element attach', function(done) {
        var el = document.createElement('test-container');
        document.body.appendChild(el);
        setTimeout(function() {
            expect(el.shadowRoot.innerHTML).toBe('<style>div.pie-wrapper{background-color:black}div.spinner{background-color:white}</style><div class="pie-wrapper">test<div class="spinner test-test"></div></div>')
            done();
        }, 0);
    });

    it('should invoke onAttach on element attach', function() {
        var el = document.createElement('test-container');
        el.setAttribute('data-test', 'this is a test');
        expect(el.trio['data-test']).toBe('this is a test');
    });

    it('should invoke onDetach on element detach', function(done) {
        var el = document.body.querySelector('test-container');
        document.body.removeChild(el);
        setTimeout(function() {
            expect(el.trio.detached).toBe(true);
            done();
        }, 0)
    });

});
