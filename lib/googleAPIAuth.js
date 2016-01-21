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
		self.jwt.authorize(function(err, data) {
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
	// Don't set global googleapis options `auth`, otherwise `googleapis` cannot use other subject contexts in app if necessary. Should
	// specify the `auth` property inside `params` for each API call, giving the `this.jwt` parameter created above, or another one with
	// whatever context necessary for the specific API call
	// google.options({auth: this.jwt});
	this.google = google;
	this.gmail = google.gmail('v1')
};
