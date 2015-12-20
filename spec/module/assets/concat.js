Trio.Module.export('http://www.trioisawesome.com/base/spec/module/assets/ef.js', function() {
	return 'f';
});

Trio.Module.export('http://www.trioisawesome.com/base/spec/module/assets/argh.js', function() {
	return 'ar';
});

Trio.Module.export('http://www.trioisawesome.com/base/spec/module/assets/bee.js', function() {
	return 'b';
});

Trio.Module.export('http://www.trioisawesome.com/base/spec/module/assets/oooo.js', function() {
	return 'oo';
});

Trio.Module.import([
	'http://www.trioisawesome.com/base/spec/module/assets/bee.js',
	'http://www.trioisawesome.com/base/spec/module/assets/argh.js'
]).and.export('http://www.trioisawesome.com/base/spec/module/assets/bah.js', function(b, ar) {
	return b + ar;
});

Trio.Module.import([
	'http://www.trioisawesome.com/base/spec/module/assets/ef.js',
	'http://www.trioisawesome.com/base/spec/module/assets/oooo.js'
]).and.export('http://www.trioisawesome.com/base/spec/module/assets/fooooo.js', function(f, oo) {
	return f + oo;
});

Trio.Module.import([
	'http://www.trioisawesome.com/base/spec/module/assets/fooooo.js',
	'http://www.trioisawesome.com/base/spec/module/assets/bah.js'
]).and.export(function(foo, bar) {
	return foo + bar;
});
