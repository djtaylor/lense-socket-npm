/**
 * Module Dependencies
 */
var config  = require('./config');
var winston = require('../node_modules/winston');

/**
 * Module Functions
 */
function LenseSocketLogger() {
	return this.setup();
}

/**
 * Setup Logger
 */
LenseSocketLogger.prototype.setup = function() {
	logger  = null;
	try {
		logger = winston.createLogger({
		  level: 'info',
		  format: winston.format.json(),
		  transports: [
		    new winston.transports.File({ filename: '/dev/stderr', level: 'error' }),
		    new winston.transports.File({ filename: '/dev/stdout' })
		  ]
		});
	} catch (e) {
		console.log('Failed to initialize logger: ' + e);
		process.exit(1);
	}
	return logger;
}

/**
 * Module Exports
 */

module.exports = new function() {
	return new LenseSocketLogger();
};
