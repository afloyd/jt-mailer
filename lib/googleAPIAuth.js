var google = require('googleapis'),
	Promise = require('bluebird');

module.exports = function(opts) {
	return new GoogleAPIAuth(opts)
	.catch(function(ex) {
		console.error('Error initializing google API:\n', ex);
	});
};

function GoogleAPIAuth(opts) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.config = opts;
		self.initClient();
		self.authorize(function(err, data) {
			if (err) reject(err);
			console.log('authdata: ', data);
			resolve(self);
		});
	});
}

GoogleAPIAuth.prototype.initClient = function() {
	var clientConfig = this.config.client;

	this.jwt = new google.auth.JWT(
		clientConfig.client_email,
		undefined,
		clientConfig.private_key,
		clientConfig.scopes || ['https://www.googleapis.com/auth/gmail.compose'],
		clientConfig.subject
	);
	google.options({auth: this.jwt});
	this.google = google;
	this.gmail = google.gmail('v1')
};

GoogleAPIAuth.prototype.authorize = function(cb) {
	this.jwt.authorize(cb);
};
