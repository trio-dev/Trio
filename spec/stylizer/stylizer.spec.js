describe('Stylizer', function() {
    var s;
    var style = {
        'div': {
            'background-color': 'black',
            'opacity': '0.8',
            'display': 'flex',
            'width': '100px',
            'height': '100px'
        },
        'span': {
            'position': 'absolute'
        }
    };
    
    beforeEach(function() {
        s = new Stylizer();
    });

    it('should stringify style object', function() {
        var ans = s.stringify(style);
        expect(ans).toBe('div{background-color:black;opacity:0.8;display:flex;display:-webkit-flex;display:-moz-flex;display:-ms-flex;display:-o-flex;width:100px;height:100px}span{position:absolute}');
    });

    it('should autoprefix when stringifying', function() {
        var ans = s.stringify({
            'div.test': {
                'display': 'flex',
                'transform': 'rotate(0deg)',
                'trasition': 'linear 2s',
                'width': 'calc(100% - 4px)'
            }
        });
        expect(ans).toBe('div.test{display:flex;display:-webkit-flex;display:-moz-flex;display:-ms-flex;display:-o-flex;transform:rotate(0deg);-webkit-transform:rotate(0deg);-moz-transform:rotate(0deg);-ms-transform:rotate(0deg);-o-transform:rotate(0deg);trasition:linear 2s;width:calc(100% - 4px);width:-webkit-calc(100% - 4px);width:-moz-calc(100% - 4px);width:-ms-calc(100% - 4px);width:-o-calc(100% - 4px)}');
    });


    it('should create style tag element', function() {
        var el = s.createStyleTag(style);
        expect(el.outerHTML).toBe('<style>div{background-color:black;opacity:0.8;display:flex;display:-webkit-flex;display:-moz-flex;display:-ms-flex;display:-o-flex;width:100px;height:100px}span{position:absolute}</style>');
    });

    it('should register variable', function() {
        var ans;
        s.registerVariable('baseColor', 'black');
        ans = s.getVariable('baseColor');
        expect(ans).toBe('black');

        s.registerVariable('baseStyle', style);
        ans = s.getVariable('baseStyle');
        expect(ans).toBe(style);
    });

    it('should replace variable when format like $variable', function() {
        s.registerVariable('rgb', 'rgb(0,0,0)');
        s.registerVariable('hex', '#F904C5');
        s.registerVariable('str', 'orange');
        s.registerVariable('opac', '0.5');
        s.registerVariable('width', '100px');
        s.registerVariable('height', '200px');
        s.registerVariable('borderWidth', '2px');
        s.registerVariable('borderColor', '#FFFFFF');

        var ans = s.stringify({
            'div.test': {
                'background-color': 'rgba($rgb, $opac)'
            }
        });
        expect(ans).toBe('div.test{background-color:rgba(0,0,0, 0.5)}');

        ans = s.stringify({
            'div.test': {
                'background-color': 'rgba($hex, $opac)'
            }
        });
        expect(ans).toBe('div.test{background-color:rgba(249,4,197, 0.5)}');

        ans = s.stringify({
            'div.test': {
                'background-color': 'rgba($str, $opac)'
            }
        });
        expect(ans).toBe('div.test{background-color:rgba(255,165,0, 0.5)}');

        ans = s.stringify({
            'div.test': {
                'width': '$width',
                'height': '$height',
                'border': '$borderWidth solid $borderColor'
            }
        })
        expect(ans).toBe('div.test{width:100px;height:200px;border:2px solid #FFFFFF}');
    });

    it('should register mixins', function() {
        var ans;
        var mixin = function(n) {
            return n + 'px';
        }
        s.registerMixin('baseLength', mixin);
        ans = s.getMixin('baseLength');
        expect(ans).toBe(mixin);
    });
});
