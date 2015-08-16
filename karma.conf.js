module.exports = function(config) {
    config.set({
        browsers: ['PhantomJS'],
        frameworks: ['jasmine'],
        reporters: ['mocha'],
        files: [
            'spec/beforeSpec.js',
            'src/helpers/*.js',
            'src/vow/*.js',
            'src/eventBus/*.js',
            'src/factory/*.js',
            'src/service/*.js',
            'src/component/*.js',
            'src/stylizer/*.js',
            'src/module/*.js',
            'src/resource/*.js',
            'src/renderer/*.js',
            'src/index.js',
            'spec/eventBus/eventBus.spec.js'
        ]
    });
};