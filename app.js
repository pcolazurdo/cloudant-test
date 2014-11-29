/**************************************************************************************************
 *
 * Developed by : Pablo E. Colazurdo
 * Date: Dec 20114
 *
 */

var express = require('express');
var url = require('url');
var querystring = require('querystring');
var log4js = require('log4js');
var util = require('util');
var twitter = require('twitter');
var http = require('http');


isCloudant = false;

// Retrieve information from Bluemix Environment if possible
if (process.env.VCAP_SERVICES) {
	  // Running on Bluemix. Parse the process.env for the port and host that we've been assigned.
	  var env = JSON.parse(process.env.VCAP_SERVICES);
	  var host = process.env.VCAP_APP_HOST;
	  var port = process.env.VCAP_APP_PORT;
	  console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);
	  // Also parse out Cloudant settings.
	  var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
		isCloudant = true;
}

var port = (process.env.VCAP_APP_PORT || 1337);
var host = (process.env.VCAP_APP_HOST || '0.0.0.0');

// Retrieve cloudant information from Linux Environment
if (process.env.COUCH_HOST) {
          var cloudant = process.env['COUCH_HOST'];
          console.log (cloudant);
					isCloudant = true;
}


if (isCloudant) {
	var nano = require('nano')(cloudant);
	var db_name = "twitter";
	var db = nano.use(db_name);
}

function insert_doc(doc, tried) {
	if (isCloudant) {
	  db.insert(doc,
	    function (error,http_body,http_headers) {
	      if(error) {
	        if(error.message === 'no_db_file'  && tried < 1) {
	          // create database and retry
	          return nano.db.create(db_name, function () {
	            insert_doc(doc, tried+1);
	          });
	        }
	        else { return console.log(error); }
	      }
	      console.log(http_body);
	  });
	}
}

  // insert_doc({nano: true}, 0);

// TODO: Get application information and use it in your app.
// var twitterInfo = JSON.parse(process.env.TWITTER_INFO || "{}");

var configTwitter = require('./twitter-cred.json');
var twit = new twitter(configTwitter);

twit.stream('user', {track:'pcolazurdo'}, function(stream) {
    stream.on('data', function(data) {
        console.log(util.inspect(data));
				//insert_doc(data, data.target_object.id_str, function (err, response) {
				//        console.log(err || response);
				//      });
    });
    //stream.on('favorite', function(data) {
    //    console.log(data.target_object.text);
    //    insert_doc(data, data.target_object.id_str, function (err, response) {
    //        console.log(err || response);
    //      });
    //});
    // Disconnect stream after five seconds
    setTimeout(stream.destroy, 5000);
});

//Create a Webserver and wait for REST API CRUD calls
require('http').createServer(function(req, res) {
	//Set up the DB connection
	 if (process.env.VCAP_SERVICES) {
		  // Running on Bluemix. Parse for  the port and host that we've been assigned.
		  var env = JSON.parse(process.env.VCAP_SERVICES);
		  var host = process.env.VCAP_APP_HOST;
		  var port = process.env.VCAP_APP_PORT;

		  console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);

		  // Also parse out Cloudant settings.
		  var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
	 }


	  // Insert document
	  if(req.method == 'POST') {
	             insert_records(req,res);
	  }
	  // List documents
	  else if(req.method == 'GET') {
	          list_records(req,res);
	   }
	   // Update a document
	   else if(req.method == 'PUT') {
	          update_records(req,res);
	    }
	    // Delete a document
	     else if(req.method == 'DELETE') {
	          delete_record(req,res);
	    }

}).listen(port, host);
console.log("Connected to port =" + port + " host =  " + host);
