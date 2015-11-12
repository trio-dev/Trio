module.exports = function(config) {
    config.set({
        browsers: ['PhantomJS'],

        frameworks: ['jasmine'],

        reporters: ['mocha', 'coverage'],

        files: [
            'spec/beforeSpec.js',
            'src/helpers/*.js',
            'src/polyfills/*.js',
            'src/vow/*.js',
            'src/signal/*.js',
            'src/factory/*.js',
            'src/service/*.js',
            'src/component/*.js',
            'src/stylizer/*.js',
            'src/module/*.js',
            'src/resource/*.js',
            'src/renderer/*.js',
            'src/index.js',
            'spec/signal/signal.spec.js',
            'spec/vow/vow.spec.js',
            'spec/renderer/renderer.spec.js',
            'spec/stylizer/stylizer.spec.js',
            'spec/component/component.spec.js',
            'spec/service/service.spec.js'
        ],

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'src/**/*.js': ['coverage']
        },

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
