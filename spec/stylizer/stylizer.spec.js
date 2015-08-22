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
        expect(ans).toBe('div{background-color:black;opacity:0.8;display:flex;width:100px;height:100px}span{position:absolute}');
    });

    it('should create style tag element', function() {
        var el = s.createStyleTag(style);
        expect(el.outerHTML).toBe('<style>div{background-color:black;opacity:0.8;display:flex;width:100px;height:100px}span{position:absolute}</style>');
    });

    it('should register variable', function() {
        var ans;
        s.registerVariables('baseColor', 'black');
        ans = s.getVariable('baseColor');
        expect(ans).toBe('black');

        s.registerVariables('baseStyle', style);
        ans = s.getVariable('baseStyle');
        expect(ans).toBe(style);
    });

    it('should register mixins', function() {
        var ans;
        var mixin = function(n) {
            return n + 'px';
        }
        s.registerMixins('baseLength', mixin);
        ans = s.getMixins('baseLength');
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
