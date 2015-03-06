module.exports = function (conf) {
	//if (!conf.debug) return;
	if (!conf.logger) return console;
	return conf.logger;
};
