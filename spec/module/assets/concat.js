Trio.Module.export(function() {
	return 'f';
}, 'http://www.trioisawesome.com/base/spec/module/assets/ef.js');

Trio.Module.export(function() {
	return 'ar';
}, 'http://www.trioisawesome.com/base/spec/module/assets/argh.js');

Trio.Module.export(function() {
	return 'b';
}, 'http://www.trioisawesome.com/base/spec/module/assets/bee.js');

Trio.Module.export(function() {
	return 'oo';
}, 'http://www.trioisawesome.com/base/spec/module/assets/oooo.js');

Trio.Module.import([
	'http://www.trioisawesome.com/base/spec/module/assets/bee.js',
	'http://www.trioisawesome.com/base/spec/module/assets/argh.js'
]).and.export(function(b, ar) {
	return b + ar;
}, 'http://www.trioisawesome.com/base/spec/module/assets/bah.js');

Trio.Module.import([
	'http://www.trioisawesome.com/base/spec/module/assets/ef.js',
	'http://www.trioisawesome.com/base/spec/module/assets/oooo.js'
]).and.export(function(f, oo) {
	return f + oo;
}, 'http://www.trioisawesome.com/base/spec/module/assets/fooooo.js');

Trio.Module.import([
	'http://www.trioisawesome.com/base/spec/module/assets/fooooo.js',
	'http://www.trioisawesome.com/base/spec/module/assets/bah.js'
]).and.export(function(foo, bar) {
	return foo + bar;
});
