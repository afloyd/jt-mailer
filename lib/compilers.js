/**
 * Jade compiling & LESS bundling, used with Juiced Jade Templates
 *
 * The MIT License (MIT)
 * Copyright (c) 2014 Austin Floyd (texsc98@gmail.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var logger,
	_ = require('lodash'),
	fileMagik = require('file-magik'),
	templates = {},
	fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	less = require('less'),
	async = require('async'),
	styleRootPath,
	cssIncludes = {},
	juice = require('juice2');

exports.renderTemplate = function renderTemplate(name, locals, cb) {
	var jadeHtml = '',
		template = templates[name];

	if (!template) {
		// return cb(lib.error.errors.emailTemplateNotFound(name));
		return cb(new Error('Email template "' + name + '" not found!'));
	}
	locals = locals || {};
	locals.cssInclude = cssIncludes;
	try {
		jadeHtml = template(locals);
	} catch (ex) {
		logger.error('Error rendering template "%s": ', name, ex);
		return cb(ex);
	}

	juice.juiceContent(jadeHtml, {
		extraCss: cssIncludes.style.css, // Main styles
		url: 'file:///' + styleRootPath + '/',
		applyLinkTags: true,
		removeStyleTags: true
	}, function renderTemplate(err, html) {
		if (err) {
			logger.error('Error juicing template "%s": ', name, err);
			return cb(err);
		}

		cb(null, html);
	});
};

exports.init = function(conf, cb) {
	logger = require('./logger')(conf);
	compileJade(conf, function(err) {
		logger.log('All Jade compiled!');
		if (err) return cb(err);
		compileLESS(conf, function (err) {
			if (err) return cb(err);
			logger.log('All LESS compiled!');
			cb(null);
		});
	});
};

function compileJade(conf, cb) {
	var extension = '.jade',
	    templateInfo = fileMagik.get(path.resolve(conf.templatesPath), {
		    recursive: true,
		    getNames: true,
		    excludeFiles: [/_layout.*/],
		    extension: extension
	    });

	logger.log('Compiling Jade templates...');
	var compiledTemplates = 0;
	_.forEach(templateInfo, function(templateProps) {
		fs.readFile(templateProps.path, function(err, contents) {
			try {
				templates[templateProps.name] = jade.compile(contents, {
					filename: templateProps.path,
					client: false,
					compileDebug: false
				});
				logger.log('\tTemplate "%s" compiled', templateProps.name + extension);
			} catch (ex) {
				logger.error('\tError compiling template:', ex);
				return cb(ex);
			}

			compiledTemplates++; // mark as compiled regardless to allow server to start
			if (compiledTemplates === templateInfo.length) {
				// lib.event.emit('email.templates.compiled');
				cb();
			}
		});
	});
}

function compileLESS(conf, cb) {
	styleRootPath = conf.stylesPath;
	var lessFileInfo = fileMagik.get(path.resolve(styleRootPath), {
		recursive: false,
		getNames: true,
		// excludeFiles: [/index\.js/],
		extension: '.less'
	});

	var parallelLessTasks = [];
	_.forEach(lessFileInfo, function(lessFileProps) {
		parallelLessTasks.push(getFile.bind(this, lessFileProps));
	});

	function getFile(lessFileInfo, callback) {
		var lessName = lessFileInfo.name,
			fileContents = '',
			compiledCSS = '',
			lastDirSepIdx = lessFileInfo.path.lastIndexOf(path.sep),
			lessDirPath = lessFileInfo.path.substring(0, lastDirSepIdx);

		logger.log('Compiling LESS files...');
		async.series([
			function(cb) {
				fs.readFile(lessFileInfo.path, function(err, contents) {
					if (err) {
						return cb(err);
					}
					fileContents = contents.toString();
					cb(null);
				});
			},
			function(cb) {
				less.render(fileContents, function(err, compiledLess) {
					if (err) {
						logger.error('\tError rendering less file "%s"', lessName);
						return cb(err);
					}

					cssIncludes[lessName] = compiledLess;
					fs.writeFile(path.join(lessDirPath, lessName + '.css'), compiledLess.css, 'utf-8', cb);
				});
			}
		], function(err) {
			if (err) {
				logger.error('\tCould not compile/write email template CSS for "%s"', lessName);
				callback(err);
			}

			logger.log('\tEmail template CSS for "%s" written to disk', lessName);
			callback(null);
		});
	}

	async.parallel(parallelLessTasks, function(err) {
		if (err) {
			logger.error('Error compiling LESS files', err);
			return cb(err);
		}
		cb();
	});
}
