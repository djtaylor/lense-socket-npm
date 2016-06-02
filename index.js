/**
 * Module Dependencies
 */
var config   = require('./lib/config');
var log      = require('./lib/logger');
var fs       = require('fs');
var http     = require('http');
var https    = require('https');
var util     = require('util');
var io       = require('./node_modules/socket.io');
var qstring  = require('querystring');
var sock     = null;

/**
 * Module Variables
 */
var name     = 'lense-socket';
var endpoint = config.engine.proto + '://' + config.engine.host + ':' + config.engine.port;
var listen   = config.socket.proto + '://' + config.socket.bind_ip + ':' + config.socket.port;
var cache    = null;

/**
 * Server String
 */
var serverStr = function() {
	var pkg = require('./node_modules/socket.io/package.json');
	var os  = require('os');
	
	// Construct the server string
	return pkg.name + '-' + pkg.version + '-' + os.type() + '-' + os.arch() + '-' + os.release();
}();

/**
 * Module Functions
 */

function LenseSocket() { 
	this.bootstrap(); 
}

/**
 * Cache API Support
 */
LenseSocket.prototype.cacheAPISupport = function(callback) {
	log.info('<CACHE>: Retrieving API endpoint support');
	
	// Request callback
	var request_callback = function(response) {
		response.setEncoding('utf8');
		
		// Response content and status code containers
		var content = '';
		var code;
		
		// Receive support data
		response.on('data', function(chunk) {
			
			// Store the response content and status code
			content += chunk;
			code     = response.statusCode;
		});
		
		// Store response data
		response.on('end', function() {
			
			// Request failed
			if (code != 200) {
				log.error('Failed to retrieve endpoint support!');
				log.error(content);
				process.exit(1);
			}
			
			// Parse the response
			try {
				cache = JSON.parse(content).data;
				
				// Cache success
				log.info('<CACHE>: response: code=' + code, 'content_length=' + content.length);
				log.debug('<CACHE>: supports: ' + JSON.stringify(cache));
				
				// Run a callback
				if (callback) { callback(); }
				
			// Failed to cache data
			} catch(e) {
				log.error('Failed to cache endpoint support!');
				log.error(e.stack);
			}
		});
	}
	
	// Submit the API request
	var request_cache = require('http').request({
			host:   config.engine.host,
			port:   config.engine.port,
			path:   '/support',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
		        'Content-Length': 0,
		        'User-Agent': serverStr
			}
		}, request_callback);
    
    // Catch any connection errors
	request_cache.on('error', function(e) {
    	log.error(e.message);
    });
    
    // End the connection and destroy
	request_cache.end();
}

/**
 * Submit API Request
 */
LenseSocket.prototype.apiSubmit = function(request) {
	log.debug('Incoming request: ' + JSON.stringify(request));
	
	// Load request handler attributes
	handler = cache[request.handler];
	
	// Request path
	var path = function() {
		if ((['GET', 'DELETE'].indexOf(handler.method) > -1) && (request.data)) {
			return '/' + handler.path + '?' + qstring.stringify(request.data);
		} else {
			return '/' + handler.path;
		}
	}();
	
	// Request options
	var options = {
		host:   config.engine.host,
		port:   config.engine.port,
		path:   path,
		method: handler.method.toUpperCase(),
		headers: {
			'Content-Type': 'application/json',
	        'User-Agent': serverStr,
	        'Lense-API-User': request.auth.user,
	        'Lense-API-Group': request.auth.group,
	        'Lense-API-Token': request.auth.token,
	        'Lense-API-Room': request.room,
		}
	};

	// Callback specified
	if ('callback' in request) {
		options.headers['Lense-API-Callback'] = request.callback;
		log.debug('Setting callback: ' + request.callback);
	}
	
	// Log the API request
	log.debug('<USER> name=' + request.auth.user + ', group=' + request.auth.group + ', room=' + request.room);
	log.info('Calling API <' + options.method + ' ' + endpoint + options.path + '>');
	
	// HTTP request callback handler
	var callback = function(response) {
		response.setEncoding('utf8');
		
		// Response content and status code containers
		var content = '';
		var code;
		
		/**
		 * Submit API Request
		 * 
		 * Forward a proxied API request from the web UI to the API server.
		 */
		response.on('data', function(chunk) {
			
			// Store the response content and status code
			content += chunk;
			code     = response.statusCode;
		});
		
		/**
		 * Return API Response
		 * 
		 * Forward the response for a proxied API request from the API server
		 * back to the web UI.
		 */
		response.on('end', function() {
			
			// Client expects a JSON response
			try {
				JSON.stringify(content);
						
			// Invalid server response
			} catch(e) {
				log.error('Failed to parse response from server: invalid JSON!');
				log.debug(content);
				log.error(e.stack);
			}
			
			// Get the response type and emit to the appropriate web socket room
			type = code == 200 ? 'info' : 'error';
			sock.sockets.in(request.room).emit('apiResponse', { 
				type: type, 
				code: code, 
				content: content 
			});
			
			// Log the response
			log.info('<RESPONSE> code=' + code, 'content_length=' + content.length + ', type=' + type);
		});
	}
	
	// Submit the API request
	var api_request = require('http').request(options, callback);
	
	// If any request data found for a POST/PUT request
	if ((['POST', 'PUT'].indexOf(handler.method) > -1) && (request.hasOwnProperty('data'))) {
		api_request.write(JSON.stringify(request.data));
	}
    
    // Catch any connection errors
	api_request.on('error', function(e) {
    	log.error(e.message);
    });
    
    // End the connection and destroy
	api_request.end();
}

/**
 * HTTP Listener
 */
LenseSocket.prototype.listenHTTP = function() {
	http = http.createServer();
	http.listen(config.socket.port, config.socket.bind_ip);
	sock = io.listen(http);
}

/**
 * HTTPS Listener
 */
LenseSocket.prototype.listenHTTPS = function() {
	https = https.createServer({ 
		key: fs.readFileSync(config.socket.ssl_key), 
		cert: fs.readFileSync(config.socket.ssl_cert), 
		ca: fs.readFileSync(config.socket.ssl_ca) 
	});
	https.listen(config.socket.port, config.socket.bind_ip);
	sock  = io.listen(https);
}

/**
 * Initialize Listener
 */
LenseSocket.prototype.listen = function() {
	try {
		this.logStartup();
		
		// Listen on HTTP / HTTPS
		((config.socket.proto == 'http') ? this.listenHTTP() : this.listenHTTPS())
    	log.info(name + ' listening on <' + listen + '>');
		
	// Failed to open listener
	} catch (e) {
		log.error(name + ' failed to listen on <' + listen + '>');
		log.error(e.stack);
		process.exit(1);
	}
}

/**
 * Log Startup
 */
LenseSocket.prototype.logStartup = function() {
	log.info('<STARTUP>: ' + name + '@' + new Date().toISOString());
	log.info('<SERVER>: ' + serverStr);
	for (var section in config) {
		for (var key in config[section]) {
			log.debug('<CONFIG>: ' + section + '.' + key + ' = ' + config[section][key]);
		}
	}
}

/**
 * Client String
 */
LenseSocket.prototype.clientStr = function(socket) {
	return socket.request.connection.remoteAddress + ':' + config.socket.port;
}

/**
 * Join Client
 * 
 * @param {socket} The socket connection object
 * @param {data}   Client data
 */
LenseSocket.prototype.joinClient = function(socket, data) {
	
	// Join the client to the room
	socket.join(data.room);
	log.info('Joining client <' + this.clientStr(socket) + '> to room <' + data.room + '>');
	
	// Client joined, emit enrollment data
	sock.sockets.in(data.room).emit('joined', {
		server:   serverStr,
		handlers: cache
	});
}

/**
 * Client Error
 */
LenseSocket.prototype.clientError = function(data, message) {
	sock.sockets.in(data.room).emit(
		'clientError', { message: message }
	);
}

/**
 * Update Client
 */
LenseSocket.prototype.updateClient = function(data) {
	if (data.hasOwnProperty('room')) {
		sock.sockets.in(data.room).emit(
			'update', { type: data.type, content: data.content }
		);
	} else {
		sock.sockets.emit(
			'update', { type: data.type, content: data.content }
		);
	}  	
}

/**
 * Refresh API Support Cache
 */
LenseSocket.prototype.refreshAPISupport = function(data) {
	this.cacheAPISupport(function() {
		sock.sockets.in(data.room).emit('getAPISupport', {
			contents: cache
		});
	});
}

/**
 * Validate Request
 */
LenseSocket.prototype.validateRequest = function(request, callback) {
	
	// Handler parameter required
	if (!('handler' in request)) {
		return this.clientError(request.auth, 'Missing required parameter "handler" in request!');
	}
	
	// Validate the handler
	if (!(request.handler in cache)) {
		return this.clientError(request.auth, 'Invalid handler "' + request.handler + '"!');
	}
	
	// Run the callback
	callback();
}

/**
 * Bootstrap Server
 */
LenseSocket.prototype.bootstrap = function() {
	var self = this;
	
	// Listen / cache supported API operations
	this.listen();
	this.cacheAPISupport();
	
	// On client connection
	sock.sockets.on('connection', function(socket) {
		
		// Join the client to the appropriate room
		socket.on('join', function(data) {
			self.joinClient(socket, data);
		});
		
		// Handle sending updates from the API to the web client
    	socket.on('update', function(data) {
    		self.updateClient(data);	
    	});
    	
    	// Refresh supported API operations
    	socket.on('refreshAPISupport', function(data) {
    		self.refreshAPISupport(data);
    	});
    	
    	// Handle errors
    	socket.on('error', function(error) {
    		log.error(error.message);
    	});
    	
    	// Handle API requests
    	socket.on('apiSubmit', function(request) {
    		self.validateRequest(request, function() {
    			self.apiSubmit(request);
    		});
    	});
	});
};

/**
 * Module Exports
 */

module.exports = new function() {
	return new LenseSocket();
};