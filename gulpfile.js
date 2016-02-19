
// basic
var gulp = require('gulp');
var browserSync = require('browser-sync');
var webpack = require('webpack');
var fs = require('fs');

// gulp plugins
var gconcat = require('gulp-concat');
var gutil = require('gulp-util');
var swig = require('gulp-swig');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');

const baseTarget    = __dirname + '/public';
const topicTgt      = baseTarget + '/topics';
const assetsTarget  = baseTarget + '/assets';
const stylesTarget  = assetsTarget + '/css';
const scriptsTarget = assetsTarget + '/scripts';
const fontsTarget   = assetsTarget + '/fonts';
const imagesTarget  = assetsTarget + '/images';
const baseSource    = __dirname + '/src';
const pageSource    = baseSource + '/pages';
const pageLayoutSrc = baseSource + '/layouts';
const topicSrc      = baseSource + '/topics';
const pageIncludes  = baseSource + '/pages/includes';
const stylesSource  = baseSource + '/css';
const scriptsSource = baseSource + '/scripts';
const fontsSource   = baseSource + '/fonts';
const imagesSource  = baseSource + '/images';

// watch the public files
// hot reload if there is changes
gulp.task('serve-dev', function() {
  var files = [
    baseTarget    + '/**/*.html',
    stylesTarget  + '/**/*.css',
    scriptsTarget + '/**/*.js'
  ];
  browserSync.init(files, {
    server: {
      baseDir: baseTarget
    }
  });
});

// watch the source files
// generates public files
gulp.task('watch', function() {
  watch([
    stylesSource + '/**/*.sass',
    stylesSource + '/**/*.scss'
  ], function () {
    gulp.run('styles');
  });
  watch([
    topicSrc + '/**/*.html',
    topicSrc + '/**/*.json'
  ], function () {
    gulp.run('topics');
  });
  watch([
    pageSource + '/**/*.html',
    pageLayoutSrc + '/**/*.html'
  ], function () {
    gulp.run('templates');
  });
  watch(scriptsSource + '/**/*.*', function () {
    gulp.run('webpack');
  });
});

// convert styles
gulp.task('styles', function() {
  gulp.src(stylesSource + '/*.sass')
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(minifyCss({
      compatibility: 'ie8'
    }))
    .pipe(gulp.dest(stylesTarget));

  gulp.src(stylesSource + '/*.scss')
    .pipe(sass())
    .pipe(minifyCss({
      compatibility: 'ie8'
    }))
    .pipe(gulp.dest(stylesTarget));
});

// convert html
gulp.task('templates', function() {
  gulp.src(
    pageSource + '/**/*.html')
   .pipe(swig({
     defaults: { cache: false },
     data: {
       'site_host': 'http://2016.opensource.hk'
     }
   }))
   .pipe(gulp.dest(baseTarget));
});

// convert topic from templates
gulp.task('topics', function() {

  // read those files everytime with fs
  // instead of `require` (will cache the file)
  var topics   = JSON.parse(fs.readFileSync(topicSrc + '/data/topics.json',   'utf8'));
  var tags     = JSON.parse(fs.readFileSync(topicSrc + '/data/tags.json',     'utf8'));
  var speakers = JSON.parse(fs.readFileSync(topicSrc + '/data/speakers.json', 'utf8'));
  var langs    = JSON.parse(fs.readFileSync(topicSrc + '/data/langs.json',    'utf8'));
  var levels   = JSON.parse(fs.readFileSync(topicSrc + '/data/levels.json',   'utf8'));

  // link generator
  var url = function(type, id) {
    if (type == 'topic') {
      return '/topics/' + id + '/';
    }
  },

  // filterBy filters object (e.g. topic) by the given
  // property name and value
  filterBy = function(name, value) {
    return function (obj) {
      return obj[name] === value;
    }
  },

  // turn an object into an array
  toArray = function(obj) {
    var arr = [];
    for ( var key in obj ) {
        arr.push(obj[key]);
    }
    return arr
  },

  // formatting (or not formatting) description strings
  displayDesc = function (input) {
    if (Array.isArray(input)) {
      return input.join(' ');
    }
    return input;
  };

  // generate topic index
  gulp.src(
    topicSrc + '/topics.html')
   .pipe(swig({
     defaults: {cache: false},
     load_json: false,
     data: {
       "url": url,
       "toArray": toArray,
       "filterBy": filterBy,
       "langs": langs,
       "levels": levels,
       "tags": tags,
       "speakers": speakers,
       "topicsByType": {
         "Talks": toArray(topics).filter(filterBy('type', 'talk')),
         "Workshops": toArray(topics).filter(filterBy('type', 'workshop')),
         "Lightning Talks": toArray(topics).filter(filterBy('type', 'lightening-talk'))
       }
     }
   }))
   .pipe(rename('/index.html'))
   .pipe(gulp.dest(topicTgt));

  // generate topic pages
  Object.keys(topics).forEach(function (key) {
    var topic = topics[key];
    gulp.src(
      topicSrc + '/topic.html')
     .pipe(swig({
       defaults: {cache: false},
       load_json: false,
       data: {
         "url": url,
         "displayDesc": displayDesc,
         "key": key,
         "tags": tags,
         "langs": langs,
         "levels": levels,
         "speakers": speakers,
         "topic": topic
       }
     }))
     .pipe(rename(key+'/index.html'))
     .pipe(gulp.dest(topicTgt));
  });

});

// bundle scripts
gulp.task('webpack', function(callback) {
  // run webpack
  var webpackCfg = require('./configs/webpack.config');
  webpack(webpackCfg, function(err, stats) {
    if(err) throw new gutil.PluginError('webpack', err);
    gutil.log('[webpack]', stats.toString({
      // output options
    }));
    callback();
  });
});

// concat and mangle vendor scripts
gulp.task('vendors', function() {
  return gulp.src([
      scriptsSource + '/vendors/bootstrap.min.js',
      scriptsSource + '/vendors/ga.js'
    ])
    .pipe(gconcat('vendors.js'))
    .pipe(gulp.dest(scriptsTarget))
    .pipe(rename('vendors.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(scriptsTarget));
});

gulp.task('images', function() {
  return gulp.src(imagesSource + '/**/*.*')
    .pipe(gulp.dest(imagesTarget));
});

gulp.task('fonts', function() {
  return gulp.src(fontsSource + '/**/*.*')
    .pipe(gulp.dest(fontsTarget));
});

// build the source files
gulp.task('build', [
  'styles',
  'templates',
  'images',
  'fonts',
  'vendors',
  'topics',
  'webpack'
]);

// dev default task(s)
gulp.task('dev', [
  'build',
  'watch',
  'serve-dev'
]);

// define default task(s)
gulp.task('run', ['dev']);
