describe('The Component Class', function() {
    var c, html, host, style, tmpl, el, frag;

    beforeEach(function(done) {
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


        c = Trio.Component.register({
            tagName: 'test-container',
            template: tmpl,
            onChange: function(attr, oldVal, newVal){
                this.testAttribute = newVal;
            },
            onAttach: function(){
                this.attached = true;
            },
            onCreate: function(){
                this.spinner = this.shadowRoot.querySelector('.spinner');
            },
            onDetach: function(){
                this.detached = true;
            },
            clickSpinner: function() {}
        });

        frag = c.render({
            content: 'test',
            className: 'test-test'
        });

        host = document.createElement('div');
        host.appendChild(frag);
        el = host.querySelector('test-container');
        document.body.appendChild(host);

        setTimeout(function() {
            done();
        }, 0);
    });

    it('should have trio methods', function() {
        expect(typeof el.uuid).toBe('string');
        expect(el.tagName).toBe('TEST-CONTAINER');
        expect(typeof el.clickSpinner).toBe('function');
        expect(typeof el.on).toBe('function');
        expect(typeof el.off).toBe('function');
        expect(typeof el.emit).toBe('function');
        expect(typeof el.broadcast).toBe('function');
        expect(typeof el.patch).toBe('function');
    });

    it('should register custom element', function() {
        expect(el.outerHTML).toBe('<test-container data-key="test-container2"></test-container>');
        expect(el.shadowRoot.innerHTML).toBe('<style>div.pie-wrapper{background-color:black}div.spinner{background-color:white}</style><div class="pie-wrapper">test<div class="spinner test-test"></div></div>');
    });

    it('should invoke onCreate on element create', function() {
        expect(el.spinner.outerHTML).toBe('<div class="spinner test-test"></div>');
    });

    it('should invoke onAttach on element attach', function() {
        expect(el.attached).toBe(true);
    });

    it('should invoke onChange on element attribute change', function() {
        el.setAttribute('data-test', 'this is a test');
        expect(el.testAttribute).toBe('this is a test');
    });

    it('should invoke onDetach on element detach', function(done) {
        document.body.removeChild(host);
        setTimeout(function() {
            expect(el.detached).toBe(true);
            done();
        }, 0)
    });

    describe("Multiple Components", function() {
        var style2, tmpl2, c2, parent;
        beforeEach(function(done) {
            style2 = Trio.Stylizer.create();
            style2.select('div.parent')
                    .css('background-color', 'black')
                .select('div.parent-el')
                    .css('background-color', 'white');

            tmpl2 = Trio.Renderer.createTemplate();
            tmpl2.open('style').text(style2.toCSS.bind(style2)).close()
                .open('div.parent-el').addClass(function(d) { return d.className; })
                    .open('test-container').data(function(d) { return d.container; }).close()
                .close();


            c2 = Trio.Component.register({
                tagName: 'test-parent-el',
                template: tmpl2
            });

            frag = c2.render({
                className: 'parent',
                container: {
                    content: 'test multiple',
                    className: 'test-multiple'
                }
            });

            host = document.createElement('div');
            host.appendChild(frag);
            parent = host.querySelector('test-parent-el');
            document.body.appendChild(host);

            setTimeout(function() {
                el = parent.shadowRoot.querySelector('test-container');
                done();
            }, 0);
        });

        it('should render both custom element', function() {
            expect(parent.outerHTML).toBe('<test-parent-el data-key="test-parent-el1"></test-parent-el>')
            expect(parent.shadowRoot.innerHTML).toBe('<style>div.parent{background-color:black}div.parent-el{background-color:white}</style><div class="parent-el parent"><test-container></test-container></div>');
            expect(el.outerHTML).toBe('<test-container></test-container>');
            expect(el.shadowRoot.innerHTML).toBe('<style>div.pie-wrapper{background-color:black}div.spinner{background-color:white}</style><div class="pie-wrapper">test multiple<div class="spinner test-multiple"></div></div>');
        });

        it('should patch both custom elements', function() {
            parent.patch({
                className: 'parent2',
                container: {
                    content: 'test multiple2',
                    className: 'test-multiple2'
                }
            });

            expect(parent.outerHTML).toBe('<test-parent-el data-key="test-parent-el2"></test-parent-el>')
            expect(parent.shadowRoot.innerHTML).toBe('<style>div.parent{background-color:black}div.parent-el{background-color:white}</style><div class="parent-el parent2"><test-container></test-container></div>');
            expect(el.outerHTML).toBe('<test-container></test-container>');
            expect(el.shadowRoot.innerHTML).toBe('<style>div.pie-wrapper{background-color:black}div.spinner{background-color:white}</style><div class="pie-wrapper">test multiple2<div class="spinner test-multiple2"></div></div>');
        });
    });

});
