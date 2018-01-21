"use strict";

var pjson = require('./package.json'),
minFilename = 'safe.min.js',
isUgly = true,
isMini = true,

gulp = require('gulp'),
del = require('del'),
concat = require('gulp-concat'),
uglify = require('gulp-uglify'),
manifest = require('gulp-manifest'),
connect = require('gulp-connect'),
fs = require('fs'),
extend  = require('extend'),
runSequence = require('run-sequence'),
gulpif = require('gulp-if'),
change = require('gulp-change'),

feedbackPath = 'js/feedback/',
workersPath = 'js/workers/',
tinyPath = 'js/tinymce/',
feedbackSrc = 'src/' + feedbackPath + '**',
workersSrc = 'src/' + workersPath + '**',
tinySrc = 'pub/' + tinyPath + '**/**',

src = {

	pub: ['pub/**'],
	boot: ['src/js/boot.js'],
	scripts: ['src/js/**/*.js', '!src/js/boot*', '!' + workersSrc, '!' + feedbackSrc],
	assets: ['src/**', '!src/js/**', '!src/css/*'],
	styles: ['src/css/*'],

},

dest = {

	dist: 'dist/',

},

serverConfig = {

	host: process.env.HOST || 'localhost',
	port: process.env.PORT || '8888',
	root: dest.dist.substr(0, dest.dist.length - 1),

	headers: {

		'Access-Control-Allow-Origin': "*",
		'Access-Control-Allow-Methods': "GET, POST",
		'Access-Control-Expose-Headers': "Content-Range",
		'Content-Security-Policy': "default-src 'self';connect-src 'self' api.safe.ad files.safe.ad localhost;script-src 'self'; img-src 'self' data: blob: http: https:;style-src safe.ad 'self' 'unsafe-inline' blob:; object-src 'none';frame-src safe.ad 'self' order.safe.ad safe: data: blob:; child-src 'self' ; media-src blob:; font-src 'self';",

	},

	/*https: {

		cert: dest.dist + 'ssl/localhost.crt',
		key: dest.dist + 'ssl/localhost.key',

	},*/

};

gulp.task('clean:dest', function(){

	return del([dest.dist + '**/*']);

});

gulp.task('build:pub', function(){

	gulp
		.src(tinySrc, {base: 'pub'})
		.pipe(gulp.dest(dest.dist));

	return gulp
		.src(src.pub.concat(['!' + tinySrc, dest.dist + 'js/' + minFilename]), {base: 'pub/'})
		.pipe(gulpif(isMini, concat(minFilename)))
		.pipe(gulpif(isUgly, uglify()))
		.pipe(gulp.dest(dest.dist + 'js'));

});

gulp.task('build:assets', function(){

	gulp
		.src(src.styles, {base: 'src/'})
		.pipe(change(changeCSS))
		.pipe(gulp.dest(dest.dist));

	return gulp
		.src(src.assets, {base: 'src/'})
		.pipe(gulp.dest(dest.dist));

});

gulp.task('build:scripts', function(cb){

	runSequence('scripts:immutable', 'scripts:build', cb);

});

gulp.task('scripts:immutable', function(){

	//feedback

	gulp
		.src(feedbackSrc)
		.pipe(gulpif(isUgly, uglify()))
		.pipe(gulp.dest(dest.dist + feedbackPath));

	//boot.js

	gulp
		.src(src.boot)
		.pipe(gulpif(isUgly, uglify()))
		.pipe(gulp.dest(dest.dist + 'js'));

	//workers dir

	return gulp
		.src(workersSrc)
		.pipe(gulpif(isUgly, uglify()))
		.pipe(gulp.dest(dest.dist + workersPath));

});

gulp.task('scripts:build', function(){

	return gulp
		.src(src.scripts.concat(dest.dist + 'js/' + minFilename))
		.pipe(gulpif(isMini, concat(minFilename)))
		.pipe(gulpif(isUgly, uglify()))
		.pipe(gulp.dest(dest.dist + 'js'));

});

gulp.task('build:manifest', function(){

	var files = [

		dest.dist + '*',
		dest.dist + '*/*',
		dest.dist + '*/*/*',
		'!' + dest.dist + 'fonts/*',
		'!' + dest.dist + 'js/feedback/embedded.js'

	];

	gulp
		.src(files, {base: dest.dist})
		.pipe(manifest({

			base: dest.dist,
			filename: 'manifest.appcache',
			exclude: 'manifest.appcache',
			prefix: '/',
			hash: true,
			timestamp: true,
			network: ['*'],

		}))
		.pipe(gulp.dest(dest.dist))

});

gulp.task('build', function(cb){

	runSequence('build:scripts', 'build:pub', 'build:assets', 'build:manifest', cb);

});

gulp.task('watch', function(){

	gulp.watch(['src/**'], ['build']);

});

gulp.task('default', function(){

	return runSequence('clean:dest', 'build', 'connect', 'watch');

});

gulp.task('connect', function(){

	if(serverConfig.https){

		serverConfig.https.cert = fs.readFileSync(serverConfig.https.cert);
		serverConfig.https.key = fs.readFileSync(serverConfig.https.key);

	}

	connect.server(extend(serverConfig, {

		middleware: function(){

			return [ function(req, res, cb){

				for(var h in serverConfig.headers) res.setHeader(h, serverConfig.headers[h]);

				if(req.method.toUpperCase() === 'OPTIONS'){ //CORS

					var reqHeaders = req.headers['access-control-request-headers'], reqMethod = req.headers['access-control-request-method'];;
					if(reqHeaders) res.setHeader('Access-Control-Allow-Headers', reqHeaders);
					if(reqMethod) res.setHeader( 'Access-Control-Allow-Method', reqMethod);
					res.statusCode = 204;
					res.end();
					return;

				}

				res.setHeader('Cache-Control', 'no-cache');
				if(req.url.indexOf('?') >= 0) req.url = req.url.substr(0, req.url.indexOf('?'));
				if(!fs.existsSync(serverConfig.root + req.url)) req.url = '/';
				cb();

			}];

		}

	}));

});

function changeCSS(content){

	return content.replace(/url\([^\w\/]*\//g, 'url(http' + (serverConfig.https ? 's' : '') + '://' + serverConfig.host + (serverConfig.port ? ':' + serverConfig.port + '/' : '/'));

}
