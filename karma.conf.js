module.exports = function(config) {
    config.set({
        browsers: ['PhantomJS'],

        frameworks: ['jasmine'],

        reporters: ['mocha', 'coverage'],

        files: [
            { pattern: 'spec/module/assets/**/*.js', included: false, served: true },
            'spec/beforeSpec.js',
            'src/polyfills/*.js',
            'src/init/*.js',
            'src/helpers/*.js',
            'src/signal/*.js',
            'src/module/*.js',
            'src/resource/*.js',
            'src/factory/*.js',
            'src/service/*.js',
            'src/stylizer/*.js',
            'src/renderer/*.js',
            'src/component/*.js',
            'src/index.js',
            'spec/vow/vow.spec.js',
            'spec/module/module.spec.js',
            'spec/signal/signal.spec.js',
            'spec/resource/resource.spec.js',
            'spec/factory/factory.spec.js',
            'spec/service/service.spec.js',
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
