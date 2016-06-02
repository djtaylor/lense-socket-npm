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
		logger = new (winston.Logger)({
			level: config.socket.log_level,
			transports: [
			    new (winston.transports.File)({
			    	filename:  config.socket.log,
		    		colorize:  false,
		    		timestamp: true,
		    		maxsize:   config.socket.log_max_size,
		    		json:      false
			    })
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