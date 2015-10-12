describe('The Renderer Class', function() {
    var r, t, el;
    beforeEach(function() {
        r  = new Renderer();
        t  = r.createTemplate();
        el = document.createElement('div');
    });

    it('should be able to create a tag', function() {
        var frag;
        t.open('div').close();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div></div>');
    });

    it('should be able to add and remove class', function() {
        var frag;
        t.open('div.inline').close()
         .open('div').addClass('add').addClass('remove').removeClass('remove').close();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div class="inline"></div><div class="add "></div>');
    });

    it('should be able to add inline styling', function() {
        var frag;
        t.open('div')
            .style('background-color', 'black')
            .style('height', '10px')
            .style('border', '1px solid blue')
         .close();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div style="background-color: black; height: 10px; border: 1px solid blue;"></div>');
    });

    it('should be able to add attributes', function() {
        var frag;
        t.open('input')
            .attr('disabled', 'true')
         .close()
         .open('div')
            .attr('contenteditable', 'true')
         .close();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<input disabled="true"><div contenteditable="true"></div>');
    });

    it('should be able to render multiple times', function() {
        var frag, fragTwo;
        var elTwo = document.createElement('div');
        t.open('input')
            .attr('disabled', 'true')
         .close()
         .open('div')
            .attr('contenteditable', 'true')
         .close();
        frag = t.render();
        fragTwo = t.render();
        el.appendChild(frag);
        elTwo.appendChild(fragTwo);
        expect(el.innerHTML).toBe('<input disabled="true"><div contenteditable="true"></div>');
        expect(elTwo.innerHTML).toBe('<input disabled="true"><div contenteditable="true"></div>');

    });

    it('should be able to pass data into render', function() {
        var frag;
        t.open('div#parent')
            .open('span.children')
                .open('span.grandchildren')
                    .if(more)
                        .open('span.more').close()
                    .else()
                        .open('span.less').close()
                    .xif()
                .close()
                .each(numbers)
                    .open('div.number').close()
                .xeach()
            .close()
        .close();

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
    
    it('should be able to nest conditionals and loops', function() {
        var frag;
        t.open('div#parent')
            .open('span.children')
                .open('span.grandchildren')
                    .if(more)
                        .open('span.more').close()
                    .else()
                        .open('span.less').close()
                    .xif()
                .close()
                .each(numbers)
                    .open('div.number')
                        .each(letters)
                            .open('div.letter').text(retVal).close()
                        .xeach()
                    .close()
                .xeach()
            .close()
        .close();

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

        expect(el.innerHTML).toBe('<div id="parent"><span class="children"><span class="grandchildren"><span class="more"></span></span><div class="number"><div class="letter">a</div><div class="letter">b</div><div class="letter">c</div><div class="letter">d</div><div class="letter">e</div></div><div class="number"><div class="letter">a</div><div class="letter">b</div><div class="letter">c</div><div class="letter">d</div><div class="letter">e</div></div><div class="number"><div class="letter">a</div><div class="letter">b</div><div class="letter">c</div><div class="letter">d</div><div class="letter">e</div></div><div class="number"><div class="letter">a</div><div class="letter">b</div><div class="letter">c</div><div class="letter">d</div><div class="letter">e</div></div><div class="number"><div class="letter">a</div><div class="letter">b</div><div class="letter">c</div><div class="letter">d</div><div class="letter">e</div></div></span></div>');

        function more(d) {
            return d.more;
        }

        function numbers(d) {
            return d.numbers;
        }

        function letters(d) {
            return d.letters;
        }

        function retVal(d) {
            return d;
        }
    });

});
