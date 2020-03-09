/* 
Run nodejs scripts as CGI scripts (via .htaccess Rewrite rule)
Original code from: https://github.com/puffnfresh/node-cgi 

Adjusted to remove warnings and allow processing of request 
body (for HTTP POST form submission)
*/

var http = require('http'),
    fs = require('fs')

var Request = function() {
	this.url = process.env['REQUEST_URI'];
	this.method = process.env['REQUEST_METHOD'];
	this.headers = {};
	for (var k in process.env) {
		if (process.env.hasOwnProperty(k) && k.indexOf("HTTP_") == 0) {
			this.headers[k.replace(/^HTTP_/, "").toLowerCase()] = process.env[k];
		}
	}

	// FIXME: There are probably more portable ways to do this, but it works on 
	// our FreeBSD target and I don't care enough to fix it at the moment
	this.body = fs.readFileSync(process.stdin.fd).toString();
	
	this.form = this.body.split("&").reduce(function(map, field) { 
		var parts = field.split("=")
		map[parts[0]] = (parts.length > 1) ? decodeURIComponent(parts[1].replace(/\+/g, " ")) : "";
		return map
	}, {})
};

// FIXME: There has to be a better way to write to stdout directly
function writeline(data) { console.log(data) }

var Response = function() {
	var body = false;

	this.writeHead = function() {
		var status = arguments[0];
		var reason = arguments[1];
		var headers = arguments[2];

		if (typeof reason != 'string') {
			headers = reason;
			reason = http.STATUS_CODES[arguments[0]] || 'unknown';
		}

		writeline('Status: ' + status + ' ' + reason);

		var field, value;
		var keys = Object.keys(headers);
		var isArray = (headers instanceof Array);

		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];

			if (isArray) {
				field = headers[key][0];
				value = headers[key][1];
			} else {
				field = key;
				value = headers[key];
			}

			writeline(field + ": " + value);
		}
	};

	this.write = function(message) {
		if (!body) {
			body = true;
			writeline("");
		}

		if (message) writeline(message);
	};

	this.flush = function() {
	};

	this.end = function() {
		this.write.apply(this, arguments);
	};

	this.stream = process.stdout;
};

var Server = function(listener, options) {
	var request = new Request();
	var response = new Response();

	this.listen = function() {
		listener(request, response);
	};
};

exports.createServer = function(listener, options) {
	return new Server(listener, options);
};
