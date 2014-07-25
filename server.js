var http = require('http');
var static = require('node-static');
var file = new static.Server('./public');
var url = require('url');
var WebSocketServer = require('ws').Server

//Docker Repository
var repository = function(path) {
	return { 
		host : process.env.NODE_REGISTRY_HOST || "localhost",
		port : process.env.NODE_REGISTRY_PORT || "5000",
		path : path,
		headers : {
			"Content-Type" : "application/json"
		}	
	}
}
// Http Request
var httpRequest = function( opts , onend , res) {
	console.log(opts);
	var request = http.request(opts,handleClient(onend));
	request.on("error",function(e) {
		console.log("error : " + e.code + " : " + e.message);
		res.writeHeader(500);
		res.end();
	});
	request.end();
}

//Client Handler
var handleClient = function(onend) {
	return function(r) {
		var body = "";
		r.on("data",function(chunk) {
			body += chunk;
		});
		r.on("error",function(e) {
			console.log("Error " + e.message);
		});
		r.on("end",function() {
		onend(body,r,onend);
		});
	}
}		

// http request handler
var handler = function(req,res) {	
	var p = url.parse(req.url,true);	
	var id = p.query.id;

	// Query Image Detail
	if (p.pathname == "/docker/api/images") {	
		var opts = repository("/v1/images/" + id + "/json");
		var onend = function(body,r) {
			res.writeHeader(r.statusCode);
			if(r.statusCode == 200) {
				res.end(body);
			}		
		}
		httpRequest(opts,onend);
	}else if (p.pathname == "/docker/api/repository") { 
		
		// Delete Tags 
		if ( req.method == "DELETE" ) {
			var onend = function( body , r) {
				res.writeHeader(r.statusCode);
				res.end("{}");
			}
			var repo = repository("/v1/repositories/" + p.query.repo + "/tags" + p.query.tag);
			repo.method = "DELETE";
			console.log(repo);
			httpRequest(repo,onend,res);

		// Query Tags and Images 
		}else if (req.method == "GET" ) {
			var opts = repository("/v1/repositories/" + id + "/tags");
			opts.method = "GET";
			var onend = function( body,r) {
				if ( r.statusCode != 200 ){
					res.writeHeader(r.statusCode);
					return;
				}
				var tags = JSON.parse(body);
				var array = new Array();
				var length = 0;
				for( var i in tags ) {
					length = length + 1;
				}
				for ( var i in tags ) {
					var senddata  = { id:i,imageId:tags[i] };
					var iOpts = repository("/v1/images/" + senddata.imageId + "/json");
					var iOnend = function(imageBody,r,me){
						var data = me.senddata;
						data.created = JSON.parse(imageBody).created;
						array.push(data);
						if ( array.length == length){
							res.writeHead(200, {'Content-Type': 'application/json'});
							res.end(JSON.stringify(array));
						}
					}
					iOnend.senddata = senddata;
					httpRequest(iOpts,iOnend);
				}
			}
			httpRequest(opts,onend);
		}
	//Static Contents
	}else {
		req.addListener('end', function () {
   			file.serve(req, res);
		}).resume();
	}
};
var server = http.createServer(handler);
server.listen(process.env.NODE_PORT || 3000);

//web socket handling
var wss = new WebSocketServer({server:server});
wss.on('connection', function(ws) {
	ws.on('message', function(message) {
		var opts = repository("/v1/search?q=" + message);
		var onend = function(body){
			ws.send(body);
		}
		console.log(opts);
		var request = http.request(opts,handleClient(onend));
		request.on("error",function(e) {
			console.log("error : " + e.code + " : " + e.message);
			ws.send(e.message);
		});
		request.end();
	});
});
console.log('websocket server created');
console.log("Server is listening");
