// Include gulp
var gulp = require('gulp'); 

// Include Our Plugins
var jshint       = require('gulp-jshint');
var concat       = require('gulp-concat');
var uglify       = require('gulp-uglify');
var rename       = require('gulp-rename');
var wrap         = require('gulp-wrap');
var strip        = require('gulp-strip-debug');
var environments = require('gulp-environments');
var sourcemaps   = require('gulp-sourcemaps');

// Set up environments
var development  = environments.development;
var production   = environments.production;

// Lint Task
gulp.task('lint', function() {
    return gulp.src('src/*/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

// Concatenate & Minify JS
gulp.task('scripts', function() {
    return gulp.src([
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
            'src/index.js'
        ])
        // Soucemap only in Development environment
        .pipe(development(sourcemaps.init()))
            .pipe(concat('trio.js'))
            .pipe(wrap('(function(){\n"use strict";\n<%= contents %>\n})();'))
            // Strip console.logs and debugger in Production environment
            .pipe(production(strip()))
        .pipe(development(sourcemaps.write()))
        .pipe(gulp.dest('dist'))
        .pipe(rename('trio.min.js'))
        // Uglify in Production environment
        .pipe(production(uglify()))
        .pipe(gulp.dest('dist'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/*/*.js', ['lint', 'scripts']);
    gulp.watch('src/*.js', ['lint', 'scripts']);
});

// Default Task
gulp.task('default', ['lint', 'scripts']);
