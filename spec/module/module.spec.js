describe('The Module Class', function() {
	it('should load one script', function(done) {
		Trio.Module.import([
			'./base/spec/module/assets/test.js'
		]).and.then(function(test) {
			expect(test).toBe('test');
			done();
		});
	});

	it('should load multiple scripts', function(done) {
		Trio.Module.import([
			'./base/spec/module/assets/foo.js',
			'./base/spec/module/assets/bar.js'
		]).and.then(function(foo, bar) {
			expect(foo + bar).toBe('foobar');
			done();
		});
	});

	it('concatenated file should still be loaded correctly', function(done) {
		Trio.Module.import([
			'./base/spec/module/assets/concat.js'
		]).and.then(function(concat) {
			expect(concat).toBe('foobar');
			done();
		});
	})
});
