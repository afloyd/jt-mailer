module.exports = function (conf) {
	var logger;
	if (!conf.logger) logger = console;
	else logger = conf.logger;

	if (conf.onlyLogErrors) {
		logger.log = function() {};
	}
	logger.debug = logger.debug ? logger.debug : logger.log;
	return logger;
};
