module.exports = function (conf) {
	var logger,
		confLogger = conf.logger;
	if (!conf.logger) logger = {log: console.log, error: console.error};
	else logger = {log: confLogger.log, error: confLogger.error};

	logger.debug = logger.debug || logger.log;
	if (conf.onlyLogErrors) {
		logger.log = logger.debug = function() {};
	}

	return logger;
};
