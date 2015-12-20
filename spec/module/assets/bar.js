Trio.Module.import([
	'./base/spec/module/assets/b.js',
	'./base/spec/module/assets/ar.js'
]).and.export(function(b, ar) {
	return b + ar;
});
