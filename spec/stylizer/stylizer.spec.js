describe('Stylizer', function() {
    var s, style;
    
    beforeEach(function() {
        style = Trio.Stylizer.create();
    });

    it('should stringify style object', function() {
        style.select('div')
                .css({
                    'background-color': 'black',
                    'opacity': '0.8',
                    'display': 'flex',
                    'width': '100px',
                    'height': '100px'
                })
            .select('span')
                .css('position', 'absolute');

        var ans = style.toCSS();

        expect(ans).toBe('div{background-color:black;opacity:0.8;display:flex;display:-webkit-flex;display:-moz-flex;display:-ms-flex;display:-o-flex;width:100px;height:100px}span{position:absolute}');
    
    });

    it('should autoprefix when stringifying', function() {
        style.select('div.test')
                .css('display', 'flex')
                .css('transform', 'rotate(0deg)')
                .css('transition', 'linear 2s')
                .css('width', 'calc(100% - 4px)');

        var ans = style.toCSS();

        expect(ans).toBe('div.test{display:flex;display:-webkit-flex;display:-moz-flex;display:-ms-flex;display:-o-flex;transform:rotate(0deg);-webkit-transform:rotate(0deg);-moz-transform:rotate(0deg);-ms-transform:rotate(0deg);-o-transform:rotate(0deg);transition:linear 2s;-webkit-transition:linear 2s;-moz-transition:linear 2s;-ms-transition:linear 2s;-o-transition:linear 2s;width:calc(100% - 4px);width:-webkit-calc(100% - 4px);width:-moz-calc(100% - 4px);width:-ms-calc(100% - 4px);width:-o-calc(100% - 4px)}');
    
    });

    it('should register variable', function() {
        var ans;
        
        Trio.Stylizer.registerVariable('baseColor', 'black');
        
        ans = Trio.Stylizer.getVariable('baseColor');
        
        expect(ans).toBe('black');
    
    });

    it('should replace variable when format like $variable', function() {
        Trio.Stylizer.registerVariable('rgb', 'rgb(0,0,0)');
        Trio.Stylizer.registerVariable('hex', '#F904C5');
        Trio.Stylizer.registerVariable('str', 'orange');
        Trio.Stylizer.registerVariable('opac', '0.5');
        Trio.Stylizer.registerVariable('width', '100px');
        Trio.Stylizer.registerVariable('height', '200px');
        Trio.Stylizer.registerVariable('borderWidth', '2px');
        Trio.Stylizer.registerVariable('borderColor', '#FFFFFF');

        style.select('div.test')
                .css('background-color', 'rgba($rgb, $opac)')
            .select('div.test-2')
                .css('background-color', 'rgba($hex, $opac)')
            .select('div.test-3')
                .css('background-color', 'rgba($str, $opac)')
            .select('div.test-4')
                .css({
                    'width': '$width',
                    'height': '$height',
                    'border': '$borderWidth solid $borderColor'
                });

        var ans = style.toCSS();

        var expected = 'div.test{background-color:rgba(0,0,0, 0.5)}' + 
                       'div.test-2{background-color:rgba(249,4,197, 0.5)}' + 
                       'div.test-3{background-color:rgba(255,165,0, 0.5)}' + 
                       'div.test-4{width:100px;height:200px;border:2px solid #FFFFFF}';
        
        expect(ans).toBe(expected);

    }); 

    it('should register mixins', function() {
        var ans;
        var mixin = function(n) {
            return n + 'px';
        }
        Trio.Stylizer.registerMixin('baseLength', mixin);
        ans = Trio.Stylizer.getMixin('baseLength');
        expect(ans).toBe(mixin);
    });
});
