module.exports = {
		
	// Configuration / Logger
	config: require('./lib/config'),
	log: require('./lib/logger'),
	
	// Server handler
	server: require('./lib/server'),
	
	// Public bootstrap method
	bootstrap: function() {
		this.config = this.config.get();
		this.log    = this.log.init(this.config);
		
		// Initialize the server
		this.server.init(this.config, this.log);
		this.server.run();
	}
}; 