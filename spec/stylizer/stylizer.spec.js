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

    })

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

    it('should register mixins', function() {
        var ans;
        var mixin = function(n) {
            return n + 'px';
        }
        s.registerMixin('baseLength', mixin);
        ans = s.getMixin('baseLength');
        expect(ans).toBe(mixin);
    });

    it('should convert RGB to HEX', function() {
        var hex = s.toHex('255, 255, 255');
        expect(hex).toBe('#ffffff');
    });

    it('should convert HEX to RGB', function() {
        var rgb = s.toRGB('#ffffff');
        expect(rgb).toBe('rgb(255,255,255)');
    });

    it('should convert HEX to RGBa', function() {
        var rgba = s.toRGBa('#ffffff', 0.8);
        expect(rgba).toBe('rgba(255,255,255,0.8)');
    });
});
