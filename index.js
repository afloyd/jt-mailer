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
googleAuth,
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
	if (logOpts.smtp) delete logOpts.smtp.auth;

	var debugLog = logger.debug ? logger.debug : logger.log;
	debugLog('Initializing jt-mailer\n email opts:', logOpts);
	return compilers.init(conf, function(err) {
		logger.log('jt-mailer completed! Took ' + ((Date.now() - start) / 1000) + ' s');
		if (err) return cb(err);

		if (confOpts.googleAuth) {
			return require('./lib/googleAPIAuth')(confOpts.googleAuth).then(function(ga) {
				googleAuth = ga;
				exports.initialized = true;
				cb(null, exports);
			});
		}

		// Shortcut method, requires nodemailer-smtp-transport package be installed
		transporter = nodemailer.createTransport(conf.smtp);
		exports.initialized = true;
		return cb(null, exports);
	});
};

exports.sendMail = function sendMail(opts, cb) {
	if (!transporter && !googleAuth) {
		return cb(new Error('Must first call `init` with configuration options for either `smtp` or `googleAuth` properly configured!'));
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

		//Allow opts to override regular config for not sending mail
		if ((!conf.sendEmail && typeof opts.sendEmail !== 'undefined' && !opts.sendEmail) ||
			(typeof opts.sendEmail !== 'undefined' && !opts.sendEmail)) {
			logger.log('Email configuration to not send');
			return cb(null, {}, renderedHtml);
		}

		if (conf.mailTo || opts.mailTo) {
			opts.to = conf.mailTo || opts.mailTo;
		}

		opts.html = renderedHtml;
		if (conf.googleAuth) {
			var rawEmail = rfc822Email(opts);
			return googleAuth.gmail.users.messages.send({
				auth: googleAuth.jwt,
				userId: 'me', // authenticated user
				resource: {
					raw: rawEmail
				}
			}, function(err, res) {
				if (err) {
					logger.error('Google API issue sending email:\n', err);
					return cb(err);
				}
				cb(null, res, renderedHtml);
			});
		}

		transporter.sendMail(opts, function (err, response) {
			if (err) {
				logger.error('nodemailer err sending email:', err);
				return cb(err);
			}

			cb(null, response, renderedHtml);
		});
	});
};

/**
 * Create a RFC822 compliant simple email
 * @param opts.from     {String}    Originator
 * @param opts.to       {String}    Recipient
 * @param opts.subject  {String}    Email subject
 * @param opts.html     {String}    Email body (plain text or html)
 * @returns             {String}    RFC822 compliant base64 encoded payload
 */
function rfc822Email(opts) {
	var emailLines = [];
	emailLines.push('From: ' + opts.from);
	emailLines.push('To: ' + opts.to);
	emailLines.push('Content-type: text/html;charset=iso-8859-1');
	emailLines.push('MIME-version: 1.0');
	emailLines.push('Subject: ' + opts.subject);
	emailLines.push('');
	emailLines.push(opts.html);

	var email = emailLines.join('\r\n').trim();
	// .replace(..) is to make it "url safe" per http://stackoverflow.com/questions/25207217/failed-sending-mail-through-google-api-in-nodejs
	return (new Buffer(email).toString('base64')).replace(/\+/g, '-').replace(/\//g, '_');
}
