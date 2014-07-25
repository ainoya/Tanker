var assert = require("assert");
var request = require("request");
var nock = require("nock");
var server = require("../server.js");

var nockUrl = 'http://localhost:5000';
nock(nockUrl).get('/v1/search?q=').reply(200, 'Ok')
nock(nockUrl).get('/v1/repositories/webserver/tags').reply(200,'{"2.0.0":"22d292ac14ac91d64fcec1bd14d1cf41a028acbc44b96ee6d0c759ea8d104da1"}');
nock(nockUrl).get('/v1/images/22d292ac14ac91d64fcec1bd14d1cf41a028acbc44b96ee6d0c759ea8d104da1/json').times(2).reply(200,'{"created":"2014-06-22T15:10:53.488024741Z"}');

describe("Server Test" , function() {

	it('Search Tags', function(done) {			
		request("http://localhost:3000/docker/api/repository?id=webserver",function(e,r,b){
			assert.equal(b, '[{"id":"2.0.0","imageId":"22d292ac14ac91d64fcec1bd14d1cf41a028acbc44b96ee6d0c759ea8d104da1","created":"2014-06-22T15:10:53.488024741Z"}]');
			done();
		});
	});
	it('Search Image', function(done) {
		request("http://localhost:3000/docker/api/images?id=22d292ac14ac91d64fcec1bd14d1cf41a028acbc44b96ee6d0c759ea8d104da1",function(e,r,b){
			assert.equal(b, '{"created":"2014-06-22T15:10:53.488024741Z"}');
			done();
		});
	});
});	
