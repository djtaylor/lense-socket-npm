/**
 * Module Dependencies
 */
var fs = require('fs');
var yaml = require('js-yaml');

/**
 * Module Variables
 */
const CONFIG_FILE = '/etc/lense/socket.yaml';

/**
 * Module Functions
 */
function LenseSocketConfig() {
	return this.parse();
}

/**
 * Parse Environment Variables
 *
 * @param {object} config - The YAML configuration object
 */
LenseSocketConfig.prototype.parse_envvars = function(config) {

	// Parsed configuration
	var _config  = {};
	var envregex = /^(.*)\<%= ENV\[\'(.*)\'\] %\>(.*)$/m

	for (const [k, section] of Object.entries(config)) {
		_config[k] = {};
		for (const [sk, sv] of Object.entries(section)) {
			if (envregex.test(sv)) {
				group = envregex.exec(sv);
				_config[k][sk] = group[1] + process.env[group[2]] + group[3];
			} else {
				_config[k][sk] = sv;
			}
		}
	}
	console.log('Done parsing config: ');
	console.log(_config);
	return _config;
}

/**
 * Load Configuration
 */
LenseSocketConfig.prototype.load = function() {

	// Attempt the parse the configuration
	try {
		config_yml = yaml.safeLoad(fs.readFileSync(CONFIG_FILE, 'utf8'));

	// Failed to load configuration file
	} catch (e) {
		console.log('Failed to parse configuration file \'' + CONFIG_FILE + '\': ' + e);
		process.exit(1);
	}

	// Return the merged configuration
	return this.parse_envvars(config_yml);
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
