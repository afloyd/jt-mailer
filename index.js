/** Email client using Juiced Jade Templates with nodemailer
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

var conf,
transporter,
logger,
_ = require('lodash'),
nodemailer = require('nodemailer'),
compilers = require('./lib/compilers');

exports.initialized = false;

exports.init = function init(confOpts, cb) {
	if (!cb) {
		console.error('must provide callback');
		return;
	}
	if (!confOpts) return cb(new Error('Must be initialized with options'));
	conf = confOpts;
	logger = require('./lib/logger')(conf);

	// Log options without auth settings
	var logOpts = _.cloneDeep(conf),
	    start = Date.now();
	delete logOpts.smtp.auth;

	logger.log('Initializing jt-mailer\n email opts:', logOpts);
	return compilers.init(conf, function(err) {
		logger.log('jt-mailer completed! Took ' + ((Date.now() - start) / 1000) + ' s');
		if (err) return cb(err);

		// Shortcut method, requires nodemailer-smtp-transport package be installed
		transporter = nodemailer.createTransport(conf.smtp);
		exports.initialized = true;
		cb(null, exports);
	});
};

exports.sendMail = function sendMail(opts, cb) {
	if (!transporter) {
		return cb(new Error('Must first call `init` with configuration options'));
	}

	opts = _.assign({}, conf.defaultOpts, opts);

	var templateOpts = opts.template;
	if (!templateOpts.name) {
		logger.error('Email template "%s" not found', templateOpts.name);
		// return cb(errors.emailTemplateNotFound(templateOpts.name));
		return cb(new Error('Email template "' + templateOpts.name + '" not found!'));
	}

	compilers.renderTemplate(templateOpts.name, templateOpts.locals, function(err, renderedHtml) {
		if (err) return cb(err);

		if (!conf.isPROD && conf.logHtml) {
			logger.log('Processed email html:\n', renderedHtml);
		}

		if ((!conf.sendEmail && !opts.sendEmail) || !opts.sendEmail) {
			logger.log('Email configuration to not send');
			return cb(null, {}, renderedHtml);
		}

		opts.html = renderedHtml;
		transporter.sendMail(opts, function(err, response) {
			if (err) {
				logger.error('nodemailer err sending email:', err);
				return cb(err);
			}

			cb(null, response, renderedHtml);
		});
	});
};
