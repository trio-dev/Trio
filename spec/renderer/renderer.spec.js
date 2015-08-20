describe('The Renderer Class', function() {
    var r, t, el;
    beforeEach(function() {
        r  = new Renderer();
        t  = r.createTemplate();
        el = document.createElement('div');
    });

    it('should be able to create a tag', function() {
        var frag;
        t.create('div').appendLast();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div></div>');
    });

    it('should be able to add and remove class', function() {
        var frag;
        t.create('div.inline').append()
         .create('div').addClass('add').addClass('remove').removeClass('remove').appendLast();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div class="inline"></div><div class="add "></div>');
    });

    it('should be able to add inline styling', function() {
        var frag;
        t.create('div')
            .style('background-color', 'black')
            .style('height', '10px')
            .style('border', '1px solid blue')
         .appendLast();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div style="background-color: black; height: 10px; border: 1px solid blue;"></div>');
    });

    it('should be able to add attributes', function() {
        var frag;
        t.create('input')
            .attr('disabled', 'true')
         .append()
         .create('div')
            .attr('contenteditable', 'true')
         .appendLast();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<input disabled="true"><div contenteditable="true"></div>');
    });

    it('should be able to pass data into render', function() {
        var frag;
        t.create('div#parent')
            .create('span.children')
                .create('span.grandchildren')
                    .if(more)
                        .create('span.more').append()
                    .else()
                        .create('span.less').append()
                    .done()
                .append()
                .each(numbers)
                    .create('div.number').append()
                .done()
            .append()
        .appendLast();

        frag = t.render({
            more: true,
            numbers: [
                { letters: ['a', 'b', 'c', 'd', 'e'] },
                { letters: ['a', 'b', 'c', 'd', 'e'] },
                { letters: ['a', 'b', 'c', 'd', 'e'] },
                { letters: ['a', 'b', 'c', 'd', 'e'] },
                { letters: ['a', 'b', 'c', 'd', 'e'] }
            ]
        });

        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div id="parent"><span class="children"><span class="grandchildren"><span class="more"></span></span><div class="number"></div><div class="number"></div><div class="number"></div><div class="number"></div><div class="number"></div></span></div>');

        function more(d) {
            return d.more;
        }

        function numbers(d) {
            return d.numbers;
        }

        function letters(d) {
            return d.letters;
        }
    });

});
