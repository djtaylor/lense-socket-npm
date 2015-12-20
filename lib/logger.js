module.exports = {
		
	// Initialize the logger
	init: function(config) {
		winston = require('../node_modules/winston');
		logger  = null;
		
		try {
			logger = new (winston.Logger)({
				level: 'debug',
				transports: [
				    new (winston.transports.File)({
				    	filename:  config.socket.log,
			    		colorize:  false,
			    		timestamp: true,
			    		maxsize:   5242880,
			    		json:      false
				    })
				]
			});
			
			// Initial log messages
			logger.info('Initialized Socket.IO proxy logger');
			logger.info('Parsed Socket.IO proxy configuration file: ');
			
			// Log the configuration parsed at runtime
			for (var gk in config) {
				for (var ck in config[gk]) {
					logger.info('CONFIG: ' + gk + '.' + ck + ' = ' + config[gk][ck]);
				}
			}
		} catch (e) {
			console.log('Failed to initialize logger: ' + e);
			process.exit(1);
		}
		return logger;
	}
};