Trio.Module.import([
	'./base/spec/module/assets/f.js',
	'./base/spec/module/assets/oo.js'
]).and.export(function(f, oo) {
	return f + oo;
});
