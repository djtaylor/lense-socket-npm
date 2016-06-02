/**
 * Module Dependencies
 */
var fs = require('fs');

/**
 * Module Variables
 */
var CONFIG_USR = '/etc/lense/socket.conf';
var CONFIG_DEF = '/etc/lense/socket.default.conf';

/**
 * Module Functions
 */
function LenseSocketConfig() {
	return this.parse();
}

/**
 * Merge Configuration
 * 
 * @param {object} usr - The user defined configuration
 * @param {object} def - The default configuration
 */
LenseSocketConfig.prototype.merge = function(usr,def) {
	
	// Final configuration
	var config = {};
	
	// Merge the user configuration over top the default
	for (var section in def) {
		if (section in usr) {
			if (!config.hasOwnProperty(section)) { config[section] = {}; }
			
			// Get each default key
			for (var key in def[section]) {
				config[section][key] = ((key in usr[section]) ? usr[section][key]: def[section][key]);
			}
			
		// User section not defined
		} else {
			config[section] = def[section];
		}
	}
	
	// Return the merged configuration
	return config;
}

/**
 * Load Configuration
 */
LenseSocketConfig.prototype.load = function() {
	
	// Attempt the parse the configuration
	try {
		
		// Parse the default and user configurations
		usr_config = JSON.parse(fs.readFileSync(CONFIG_USR, 'utf-8'));
		def_config = JSON.parse(fs.readFileSync(CONFIG_DEF, 'utf-8'));
		
	// Failed to load configuration file
	} catch (e) {
		console.log('Failed to parse configuration file \'' + CONFIG_USR + '\': ' + e);
		process.exit(1);
	}
	
	// Return the merged configuration
	return this.merge(usr_config, def_config);
}

/**
 * Parse Configuration
 */
LenseSocketConfig.prototype.parse = function() {
	
	// Load the configuration
	return this.load();
}

/**
 * Module Exports
 */

module.exports = new function() {
	return new LenseSocketConfig();
};