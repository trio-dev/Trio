describe('The Renderer Class', function() {
    var r, t, el;
    beforeEach(function() {
        t  = Trio.Renderer.createTemplate();
        el = document.createElement('div');
    });

    it('should be able to create a tag', function() {
        var frag;
        t.open('div').close();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div></div>');
    });

    it('should be able to add class', function() {
        var frag;
        t.open('div.inline').close()
         .open('div').addClass('add').close();
        frag = t.render();
        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div class="inline"></div><div class="add"></div>');
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

    it('should be able to render ifs', function() {
        var frag;

        t.open('div#parent')
            .if(true)
                .open('span.true').close()
            .xif()
         .close();

        frag = t.render();

        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div id="parent"><span class="true"></span></div>');

        t = Trio.Renderer.createTemplate();
        el.innerHTML = "";

        t.open('div#parent')
            .if(false)
                .open('span.true').close()
            .else()
                .open('span.false').close()
            .xif()
         .close();

        frag = t.render();

        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div id="parent"><span class="false"></span></div>');
    });

    it('should be able to render each', function() {
        var frag;

        t.open('div#parent')
            .each([1, 2, 3, 4, 5])
                .open('span.number').close()
            .xeach()
         .close();

        frag = t.render();

        el.appendChild(frag);

        expect(el.innerHTML).toBe('<div id="parent"><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span></div>');
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
    
    describe("Patch method", function() {
        it("should patch text", function() {
            var frag;
            t.open('div#parent').text(function(d) {return d.name}).close()
            .open('div#parent').text(function(d) {return d.name1}).close()
            .open('div#parent').text(function(d) {return d.name2}).close();

            var res = t.render({
                name: 'Chi Kei Chan',
                name1: 'Chi Kei Chan',
                name2: 'Chi Kei Chan',
            });

            el.appendChild(res);

            expect(el.innerHTML).toBe('<div id="parent">Chi Kei Chan</div><div id="parent">Chi Kei Chan</div><div id="parent">Chi Kei Chan</div>');

            t.patch(el, {
                name: 'Chi Kei',
                name1: 'Chi Chan',
                name2: 'Jacky Chan',
            });

            expect(el.innerHTML).toBe('<div id="parent">Chi Kei</div><div id="parent">Chi Chan</div><div id="parent">Jacky Chan</div>');

            t.patch(el, {
                name: '2',
                name1: '2',
                name2: '2',
            });

            expect(el.innerHTML).toBe('<div id="parent">2</div><div id="parent">2</div><div id="parent">2</div>');

            t.patch(el, {});

            expect(el.innerHTML).toBe('<div id="parent"></div><div id="parent"></div><div id="parent"></div>');
        });

        it("should patch class", function() {
            var frag;
            t.open('div#parent')
                .text(function(d) {return d.name})
                .addClass(function(d) {return d.cName})
            .close();

            var res = t.render({
                name: 'Chi Kei Chan',
                cName: 'test'
            });

            el.appendChild(res);

            expect(el.innerHTML).toBe('<div id="parent" class="test">Chi Kei Chan</div>');

            t.patch(el, {
                cName: 'test2'
            });

            expect(el.innerHTML).toBe('<div id="parent" class=" test2"></div>');

            t.patch(el, {
                name: 'Jacky Chan',
                cName: 'test2'
            });

            expect(el.innerHTML).toBe('<div id="parent" class=" test2">Jacky Chan</div>');
        });

        it("should patch style", function() {
            var frag;
            t.open('div#parent')
                .text(function(d) {return d.name})
                .addClass(function(d) {return d.cName})
                .style('background-color', function(d) {return d.color})
                .style('height', function(d) {return d.height})
            .close();

            var res = t.render({
                name: 'Chi Kei Chan',
                cName: 'test',
                color: 'black',
                height: '12px'
            });

            el.appendChild(res);

            expect(el.innerHTML).toBe('<div id="parent" class="test" style="background-color: black; height: 12px;">Chi Kei Chan</div>');

            t.patch(el, {
                color: 'white',
                height: '20px'
            });

            expect(el.innerHTML).toBe('<div id="parent" class=" " style="background-color: white; height: 20px;"></div>');

            t.patch(el, {
                name: 'Jacky Chan',
                cName: 'test2'
            });

            expect(el.innerHTML).toBe('<div id="parent" class=" test2" style="">Jacky Chan</div>');
        });

        it("should patch attributes", function() {
            var frag;
            t.open('div#parent')
                .text(function(d) {return d.name})
                .addClass(function(d) {return d.cName})
                .style('background-color', function(d) {return d.color})
                .attr('disabled', function(d) {return d.isDisabled})
            .close();

            var res = t.render({
                name: 'Chi Kei Chan',
                cName: 'test',
                color: 'black',
                isDisabled: true
            });

            el.appendChild(res);

            expect(el.innerHTML).toBe('<div id="parent" class="test" disabled="true" style="background-color: black;">Chi Kei Chan</div>');

            t.patch(el, {
                isDisabled: false
            });

            expect(el.innerHTML).toBe('<div id="parent" class=" " disabled="false" style=""></div>');

            t.patch(el, {
                name: 'Jacky Chan',
                cName: 'test2'
            });

            expect(el.innerHTML).toBe('<div id="parent" class=" test2" disabled="" style="">Jacky Chan</div>');
        });

        it("should patch conditionals", function() {
            var frag;
            t.open('div#parent')
                .if(more)
                    .open('span.more').close()
                .xif()
            .close();

            res = t.render({
                more: true,
            });

            el.appendChild(res);

            expect(el.innerHTML).toBe('<div id="parent"><span class="more"></span></div>');

            t.patch(el, {
                more: false
            })

            expect(el.innerHTML).toBe('<div id="parent"></div>');

            function more(d) {
                return d.more;
            }
        });

        it("should patch each", function() {
            var frag;

            t.open('div#parent')
                .each(number)
                    .open('span.number').close()
                .xeach()
             .close();

            frag = t.render({
                numbers: [1, 2, 3, 4, 5]
            });

            el.appendChild(frag);

            expect(el.innerHTML).toBe('<div id="parent"><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span></div>');

            t.patch(el, {
                numbers: [1, 2, 3]
            });
            
            expect(el.innerHTML).toBe('<div id="parent"><span class="number"></span><span class="number"></span><span class="number"></span></div>');

            t.patch(el, {
                numbers: [1, 2, 3, 4, 5, 6, 7, 8]
            });
            
            expect(el.innerHTML).toBe('<div id="parent"><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span><span class="number"></span></div>');

            function number(d) {
                return d.numbers;
            }
        });
    });

    describe("Some complex templates", function() {

        it('should render wall posts', function() {
            var frag;

            t.open('div#social-post')
                .if(function(d) {return d.isCurrentUser})
                    .addClass('current-user')
                .xif()
                .open('div.info')
                    .open('div.first-name').text(function(d) {return d.firstName}).close()
                    .open('div.last-name').text(function(d) {return d.lastName}).close()
                .close()
                .open('div.posts')
                    .each(function(d) {return d.posts})
                        .open('div.post')
                            .open('div.post-message').text(function(d) {return d.message}).close()
                            .if(function(d) { return d.isDeletable})
                                .open('span.delete-icon').close()
                            .xif()
                            .each(function(d) {return d.followers})
                                .open('span.follower-name').text(function(d) {return d.name}).close()
                            .xeach()
                        .close()
                    .xeach()
                .close()
            .close()

            frag = t.render({
                isCurrentUser: true,
                firstName: 'Jacky',
                lastName: 'Chan',
                posts: [
                    {
                        message: 'First post',
                        isDeletable: false,
                        hasFollowers: false,
                        followers: []
                    },
                    {
                        message: 'Second post',
                        isDeletable: true,
                        hasFollowers: true,
                        followers: [{name: 'F1'}, {name: 'F2'}, {name: 'F3'}]
                    },
                    {
                        message: 'Third post',
                        isDeletable: false,
                        hasFollowers: true,
                        followers: [{name: 'F1'}, {name: 'F2'}, {name: 'F3'}, {name: 'F1'}, {name: 'F2'}, {name: 'F3'}]
                    },
                    {
                        message: 'Forth post',
                        isDeletable: true,
                        hasFollowers: false,
                        followers: []
                    }
                ]
            });

            el.appendChild(frag);

            var html = '<div id="social-post" class="current-user">' + 
                            '<div class="info">' + 
                                '<div class="first-name">Jacky</div>' + 
                                '<div class="last-name">Chan</div>' + 
                            '</div>' + 
                            '<div class="posts">' + 
                                '<div class="post">' + 
                                    '<div class="post-message">First post</div>' +
                                '</div>' + 
                                '<div class="post">' + 
                                    '<div class="post-message">Second post</div>' + 
                                    '<span class="delete-icon"></span>' + 
                                    '<span class="follower-name">F1</span>' + 
                                    '<span class="follower-name">F2</span>' + 
                                    '<span class="follower-name">F3</span>' + 
                                '</div>' +
                                '<div class="post">' +
                                    '<div class="post-message">Third post</div>' +
                                    '<span class="follower-name">F1</span>' +
                                    '<span class="follower-name">F2</span>' +
                                    '<span class="follower-name">F3</span>' +
                                    '<span class="follower-name">F1</span>' +
                                    '<span class="follower-name">F2</span>' +
                                    '<span class="follower-name">F3</span>' +
                                '</div>' +
                                '<div class="post">' +
                                    '<div class="post-message">Forth post</div>' +
                                    '<span class="delete-icon"></span>' +
                                '</div>' +
                            '</div>' +
                        '</div>';

            expect(el.innerHTML).toBe(html);

            html = '<div id="social-post" class=" ">' +
                        '<div class="info">' +
                            '<div class="first-name">Chi Kei</div>' +
                            '<div class="last-name">Chan</div>' +
                        '</div>' +
                        '<div class="posts">' +
                            '<div class="post">' +
                                '<div class="post-message">First post</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

            t.patch(el, {
                isCurrentUser: false,
                firstName: 'Chi Kei',
                lastName: 'Chan',
                posts: [
                    {
                        message: 'First post',
                        isDeletable: false,
                        hasFollowers: false,
                        followers: []
                    }
                ]
            })

            expect(el.innerHTML).toBe(html);

            html = '<div id="social-post" class=" ">' +
                        '<div class="info">' +
                            '<div class="first-name">Chancellor</div>' +
                            '<div class="last-name"></div>' +
                        '</div>' +
                        '<div class="posts">' +
                            '<div class="post">' + 
                                '<div class="post-message">First post</div>' +
                            '</div>' + 
                            '<div class="post">' + 
                                '<div class="post-message">Second post</div>' + 
                                '<span class="delete-icon"></span>' + 
                                '<span class="follower-name">F1</span>' + 
                                '<span class="follower-name">F2</span>' + 
                                '<span class="follower-name">F3</span>' + 
                            '</div>' +
                            '<div class="post">' +
                                '<div class="post-message">Third post</div>' +
                                '<span class="follower-name">F1</span>' +
                                '<span class="follower-name">F2</span>' +
                                '<span class="follower-name">F3</span>' +
                                '<span class="follower-name">F1</span>' +
                                '<span class="follower-name">F2</span>' +
                                '<span class="follower-name">F3</span>' +
                            '</div>' +
                            '<div class="post">' +
                                '<div class="post-message">Forth post</div>' +
                                '<span class="delete-icon"></span>' +
                            '</div>' +
                            '<div class="post">' + 
                                '<div class="post-message">First post</div>' +
                            '</div>' + 
                            '<div class="post">' + 
                                '<div class="post-message">Second post</div>' + 
                                '<span class="delete-icon"></span>' + 
                                '<span class="follower-name">F1</span>' + 
                                '<span class="follower-name">F2</span>' + 
                                '<span class="follower-name">F3</span>' + 
                            '</div>' +
                            '<div class="post">' +
                                '<div class="post-message">Third post</div>' +
                                '<span class="follower-name">F1</span>' +
                                '<span class="follower-name">F2</span>' +
                                '<span class="follower-name">F3</span>' +
                                '<span class="follower-name">F1</span>' +
                                '<span class="follower-name">F2</span>' +
                                '<span class="follower-name">F3</span>' +
                            '</div>' +
                            '<div class="post">' +
                                '<div class="post-message">Forth post</div>' +
                                '<span class="delete-icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

            t.patch(el, {
                isCurrentUser: false,
                firstName: 'Chancellor',
                lastName: '',
                posts: [
                    {
                        message: 'First post',
                        isDeletable: false,
                        hasFollowers: false,
                        followers: []
                    },
                    {
                        message: 'Second post',
                        isDeletable: true,
                        hasFollowers: true,
                        followers: [{name: 'F1'}, {name: 'F2'}, {name: 'F3'}]
                    },
                    {
                        message: 'Third post',
                        isDeletable: false,
                        hasFollowers: true,
                        followers: [{name: 'F1'}, {name: 'F2'}, {name: 'F3'}, {name: 'F1'}, {name: 'F2'}, {name: 'F3'}]
                    },
                    {
                        message: 'Forth post',
                        isDeletable: true,
                        hasFollowers: false,
                        followers: []
                    },
                    {
                        message: 'First post',
                        isDeletable: false,
                        hasFollowers: false,
                        followers: []
                    },
                    {
                        message: 'Second post',
                        isDeletable: true,
                        hasFollowers: true,
                        followers: [{name: 'F1'}, {name: 'F2'}, {name: 'F3'}]
                    },
                    {
                        message: 'Third post',
                        isDeletable: false,
                        hasFollowers: true,
                        followers: [{name: 'F1'}, {name: 'F2'}, {name: 'F3'}, {name: 'F1'}, {name: 'F2'}, {name: 'F3'}]
                    },
                    {
                        message: 'Forth post',
                        isDeletable: true,
                        hasFollowers: false,
                        followers: []
                    }
                ]
            });

            expect(el.innerHTML).toBe(html);

        });
    });
});
