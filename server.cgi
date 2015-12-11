#!/usr/local/bin/node

var BASE = "/art/submit/"

var cgi = require('./cgi'),
    url = require('url'),
    path = require('path'),
    fs = require('fs')

function send404(response, file) {
  	response.writeHead(404, {});
  	response.write("Not Found: " + file);
}

var headers = {
	'Pragma-directive': 'no-cache',
	'Cache-directive': 'no-cache',
	'Cache-control': 'no-cache',
	'Pragma': 'no-cache',
	'Expires': '0'
}

var server = cgi.createServer(function(request, response) {
	var target = url.parse(request.url).path.replace(new RegExp("^"+BASE), "");
    
    // Check if the file that was requested exists in the /server dir
    // If it is there then execute it as a server script and we are done. 
    var processed = fs.readdirSync('server').some(function(script) {
        if (target == script) {
            require('./server/' + script).processRequest(request, response)
            return true
        }
    })

	// if the request was not for a server script then try to serve it as a static file
    if (!processed) {
    	target = "static/" + target
        try {
            fs.accessSync(target, fs.F_OK)
            response.writeHead(200, headers);
            response.write(fs.readFileSync(target, 'UTF-8'));
        } catch (e) {
            send404(response, target);
		}
    }

    response.end();
});
server.listen();
