module.exports = function(config) {
    config.set({
        browsers: ['PhantomJS'],

        frameworks: ['jasmine'],

        reporters: ['mocha', 'coverage'],

        files: [
            'spec/beforeSpec.js',
            'src/polyfills/*.js',
            'src/init/*.js',
            'src/stylizer/*.js',
            'src/renderer/*.js',
            'src/component/*.js',
            'src/index.js',
            'spec/renderer/renderer.spec.js',
            'spec/stylizer/stylizer.spec.js',
            'spec/component/component.spec.js'
        ],

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'src/**/!(*webcomponents).js': ['coverage']
        },

        singleRun: true,

        // optionally, configure the reporter
        coverageReporter: {
            dir : 'coverage/',
            reporters: [
                // reporters not supporting the `file` property
                { type: 'lcov', subdir: '.' },
                { type: 'text-summary', subdir: '.'},
                { type: 'text', subdir: '.'}
            ]
        }
    });
};
