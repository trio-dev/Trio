// Include gulp
var gulp = require('gulp'); 

// Include Our Plugins
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var wrap = require('gulp-wrap');

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
        .pipe(concat('trio.js'))
        .pipe(wrap('(function(){\n"use strict";\n<%= contents %>\n})();'))
        .pipe(gulp.dest('dist'))
        .pipe(rename('trio.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/*/*.js', ['lint', 'scripts']);
    gulp.watch('src/*.js', ['lint', 'scripts']);
});

// Default Task
gulp.task('default', ['lint', 'scripts']);
