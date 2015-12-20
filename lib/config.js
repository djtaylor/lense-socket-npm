module.exports = {
		
	// Retrieve the Lense Socket configuration
	get: function() {
		fs = require('fs');
		
		// Read the configuration file
		config_file = fs.readFileSync('/etc/lense/socket.conf', 'utf-8');
		
		// Attempt the parse the configuration
		try {
			
			// Parse the configuration object
			config = JSON.parse(config_file);
		} catch (e) {
			console.log('Failed to parse configuration file \'' + config_file + '\': ' + e);
			process.exit(1);
		}
		
		// Validate the configuration
		try {
			if (config.hasOwnProperty('socket')) { 
				socket_required = ['host', 'proto', 'port'];
				for (var key in socket_required) {
					if (! config.socket.hasOwnProperty(socket_required[key])) {
						console.log('Missing required key \'' + socket_required[key] + '\' in socket config group');
						process.exit(1);
					}
				}
			} else {
				console.log('Missing required \'socket\' group in config file: ' + config_file); 
				process.exit(1);
			}
		} catch (e) {
			console.log('Failed to validate the configuration file \'' + config_file + '\': ' + e);
			process.exit(1);
		}
		return config;
	}
};