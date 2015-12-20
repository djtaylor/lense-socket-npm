module.exports = {
		
	// Configuration / Logger
	config: null,
	log: null,
	
	// FS/HTTP/HTTPS handler
	fs: require('fs'),
	http: require('http'),
	https: require('https'),
	
	// SocketIO objects
	io: require('../node_modules/socket.io'),
	sock: null,
	
	// Initialize the server
	init: function(c,l) {
		this.config = c;
		this.log    = l;
		
		// Set up the listener
    	try {
    		
    		// HTTP
        	if (this.config.socket.proto == 'http') {
        		this.http = this.http.createServer();
        		this.http.listen(this.config.socket.port, this.config.socket.bind_ip);
        		this.sock = this.io.listen(this.http);
        	}
        	
        	// HTTPS
        	if (this.config.socket.proto == 'https') {
            	var ssl_options = {
            		key:    this.fs.readFileSync(this.config.socket.ssl_key),
            	    cert:   this.fs.readFileSync(this.config.socket.ssl_cert),
            	    ca:		this.fs.readFileSync(this.config.socket.ssl_ca)	
            	}
            	this.https = this.https.createServer(options);
            	this.https.listen(this.config.socket.port, this.config.socket.host);
            	this.sock  = this.io.listen(this.https);
        	}
        	
        	// Listener is running
        	this.log.info('Started Socket.IO listener');
        	
        // Error in Socket.IO
    	} catch (e) {
    		console.log(e);
    		this.log.error('Failed to set up Socket.IO listener: ' + e);
    		process.exit(1);
    	}
	},
	
	// Validate API request
	validate_request: function(request) {
		
		// Required base and socket parameters
		br = ['api_user', 'api_token', 'api_group', 'socket', 'action'];
		sr = ['method', 'path', 'room'];
		
		// Validate the required base parameters
		for (var k in br) {
			if (! request.hasOwnProperty(br[k])) {
				this.log.error('Missing required base key \'' + br[k] + '\' in request body');
				return false;
			}
		}
		
		// Validate the required socket parameters
		for (var k in sr) {
			if (! request.socket.hasOwnProperty(sr[k])) {
				this.log.error('Missing required socket key \'' + sr[k] + '\' in request body');
				return false;
			}
		}
		
		// Request looks OK
		return true;
	},
	
	// Submit API request
	api_submit: function(client) {
    	
    	// Options for the request
    	var request_options = {
    		host:   this.config.engine.host,
    	    port:   this.config.engine.port,
    	    path:   '/' + client.socket.path,
    	    method: client.socket.method.toUpperCase(),
    	    headers: {
    	    	'Content-Type': 'application/json',
    	        'Content-Length': request_data.length,
    	        'Lense-API-User': client.auth.user,
    	        'Lense-API-Group': client.auth.group,
    	        'Lense-API-Token': client.auth.token
    	    }
    	};
    	
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
    			code     = response.statusCode 
    		});
    		
    		/**
    		 * Return API Response
    		 * 
    		 * Forward the response for a proxied API request from the API server
    		 * back to the web UI.
    		 */
    		response.on('end', function() {
    			
    			// Get the response type and emit to the appropriate web socket room
    			type = code == 200 ? 'info' : 'error';
    			this.sock.sockets.in(client.socket.room).emit('response', { type: type, code: code, content: content });
    		});
    	}
    	
    	// Submit the HTTP request
    	var request = require('http').request(request_options, callback);
    	
    	// If any request data found for a POST request
    	if (client.socket.method == 'post' && client.hasOwnProperty('_data')) {
    		request.write(client._data);
    	}
        
        // Catch any connection errors
        request.on('error', function(e) {
        	this.log.error(e.message);
        });
        
        // End the connection and destroy
        request.end();
	},
	
	run: function() {
		
		// Define the API url
		api_url = this.config.engine.proto + '://' + this.config.engine.host + ':' + this.config.engine.port;
		
		// Handle client connections
		this.sock.sockets.on('connection', function(socket) {  
	    	
	    	// Join the client to the appropriate room
	    	socket.on('join', function(data) {
	    		this.log.info('Joined socket connection <' + socket.id + '> to room <' + data.room + '>');
	    		socket.join(data.room);
	    	});
	    
	    	// Handle sending updates from the API to the web client
	    	socket.on('update', function(data) {
	    		
	    		// If sending to a specific room
	    		if (data.hasOwnProperty('room')) {
	    			this.sock.sockets.in(data.room).emit(
    	    			'update', { type: data.type, content: data.content }
    	    		);
	    			
	    		// If sending to all clients
	    		} else {
	    			this.sock.sockets.emit(
    	    			'update', { type: data.type, content: data.content }
    	    		);
	    		}  		
	    	});
	    	
	    	// Handle errors
	    	socket.on('error', function(e) {
	    		this.log.error(e.message);
	    	});
	    	
	    	// Handle API requests
	    	socket.on('submit', function(client) {
	    		
	    		// Validate the request object
	    		if (self.valid_request(client) === false) {
	    			this.log.error('Invalid request object');
	    		} else {
	    			
	    			// Set the log metadata
	    			log_meta = {
	    				'socket_id': socket.id,
	    				'request':   client
	    			}
	    			
	    			// Handle the request
	    			this.log.info('Processing client request: ', log_meta);
	    			
	    			// Submit the API request
	    			this.api_submit(client);
	    		}
	    	});
	    });
	}
}; 