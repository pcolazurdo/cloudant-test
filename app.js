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
var https = require('https');
var xmlescape = require('xml-escape');


//detect environment we're running - default is 'DEV'
var env = process.env.NODE_ENV || 'DEV';

// Setup logging
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('output.log',null,1000000000));
log4js.replaceConsole() // the important part
var logger = log4js.getLogger();
// End Setup logging

//Capture all Unhandled Errors - seems not recommended in production so we use
// it only if we aren't in PROD
if (env != 'PROD') {
	process.on('uncaughtException', function(err) {
    setTimeout(function() {
    	console.log("Catched Fire on an Unhandled Error!")
    	console.log(err);
			}, 3000);
  });
}


console.log("App Started: " + Date().toString());

// setup middleware
var app = express();
app.use(express.errorHandler());
app.use(express.urlencoded()); // to support URL-encoded bodies
app.use(app.router);

app.use(express.static(__dirname + '/public')); //setup static public directory
app.set('view engine', 'jade');
app.set('views', __dirname + '/views'); //optional since express defaults to CWD/views

// There are many useful environment variables available in process.env.
// VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
// TODO: Get application information and use it in your app.

// defaults for dev outside bluemix
var service_url = '<service_url>';
var service_username = '<service_username>';
var service_password = '<service_password>';
var re_service_url = '<service_url>';
var re_service_username = '<service_username>';
var re_service_password = '<service_password>';
var cloudant = '<cloudant credentials>';


// Retrieve information from Bluemix Environment if possible
if (process.env.VCAP_SERVICES) {
	  // Running on Bluemix. Parse the process.env for the port and host that we've been assigned.
	  var services = JSON.parse(process.env.VCAP_SERVICES);
	  var host = process.env.VCAP_APP_HOST || '127.0.0.1';
	  var port = process.env.VCAP_APP_PORT || 3000;
	  console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);
	  // Also parse out Cloudant settings.
	  var cloudant = services['cloudantNoSQLDB'][0]['credentials'];
		  try {
    		var service_name = 'language_identification';
    		if (services[service_name]) {
      		var svc = services[service_name][0].credentials;
      		service_url = svc.url;
      		service_username = svc.username;
      		service_password = svc.password;
    		} else {
      		console.log('The service '+service_name+' is not in the VCAP_SERVICES, did you forget to bind it?');
    		}
  		}
  		catch (e){
    		setTimeout(function() {
        	console.log("Catched Fire on getting services")
        	console.log(e);
    		}, 3000);
  }

  try {
    var re_service_name = 'relationship_extraction';
    if (services[re_service_name]) {
      var re_svc = services[re_service_name][0].credentials;
      re_service_url = re_svc.url;
      re_service_username = re_svc.username;
      re_service_password = re_svc.password;
    } else {
      console.log('The service '+re_service_name+' is not in the VCAP_SERVICES, did you forget to bind it?');
    }
  }
  catch (e){
    setTimeout(function() {
        console.log("Catched Fire on getting services")
        console.log(e);
    }, 3000);
  }

}

var host = process.env.VCAP_APP_HOST || '127.0.0.1';
var port = process.env.VCAP_APP_PORT || 3000;

// Retrieve cloudant information from Linux Environment
if (process.env.COUCH_HOST) {
          var cloudant = process.env['COUCH_HOST'];
					console.log (cloudant);
}

var auth = 'Basic ' + new Buffer(service_username + ':' + service_password).toString('base64');
var re_auth = 'Basic ' + new Buffer(re_service_username + ':' + re_service_password).toString('base64');


console.log('service_url = ' + service_url);
console.log('service_username = ' + service_username);
console.log('service_password = ' + new Array(service_password.length).join("X"));
console.log('re_service_url = ' + re_service_url);
console.log('re_service_username = ' + re_service_username);
console.log('re_service_password = ' + new Array(re_service_password.length).join("X"));
console.log('cloudant = ' + cloudant);

// Setup Cloudant connection
if (cloudant) {
	var nano = require('nano')(cloudant);
	var db_name = "twitter";
	//try creating the database. If it already exists it will log a message.
	nano.db.create(db_name, function (error, body, headers) {
    if(error) {
			console.log ("Error while creating the database " + db_name);
			console.log (error.message);
			console.log (error['status-code']);
		}
	});
	var db = nano.use(db_name);
}


// Function to insert a new Doc into the Cloudant database
function insert_doc(doc) {
	if (cloudant) {
	  db.insert(doc, function (error,http_body,http_headers) {
	      if(error) return console.log(error);
	    });
      // console.log(http_body);
		}
}

// Function to count documents in the db
function countView(callback) {
	var count = 0;
	var lastTimeStamp = 0;
	var status;
	db.view("design1", "countView", {"group": true, "reduce": true}, function(err, body) {
		if (err) {
			console.log(err);
			status = {'error': err};
		} else {
			//console.log(body);
			body.rows.forEach(function(doc) {
				count = doc.value;
			});
			db.view("design1", "lastTimeView", {"limit": 1, "descending": true}, function(err, body) {
				if (err) {
					console.log(err);
					status = {'error': err};
				} else {
					//console.log(body);
					body.rows.forEach(function(doc) {
						//console.log("doc", doc);
						var date = new Date(parseInt(doc.key));
						status = {'count': count, 'lasttimestamp': date};
					});
				}
				callback(status);
			}
		)};
	});
}

// TODO: Get application information and use it in your app.
// var twitterInfo = JSON.parse(process.env.TWITTER_INFO || "{}");
var configTwitter = require('./twitter-cred.json');
var twit = new twitter(configTwitter);

twit.stream('user', {track:'pcolazurdo'}, function(stream) {
    stream.on('data', function(data) {
        //console.log(typeof data.target_object);
				//console.log(typeof data.id_str);
				//console.log(util.inspect(data));
				// Only insert tweets
				if (typeof data.id_str !== 'undefined') insert_doc(data);
    });
		stream.on('error', function(data) {
				//console.log(typeof data.target_object);
				//console.log(typeof data.id_str);
				console.log(util.inspect(data));
		});
    //stream.on('favorite', function(data) {
    //    console.log(data.target_object.text);
    //    insert_doc(data, data.target_object.id_str, function (err, response) {
    //        console.log(err || response);
    //      });
    //});
    // Disconnect stream after five seconds
    //setTimeout(stream.destroy, 5000);
});



//
// API REST
//
app.get( '/api', function( request, response ) {
    var resp = [
            {
                Application: "watson-pcolazurdo",
                ServiceUrl: service_url,
                Status: "Ok"
            }
        ];
    console.log("GET /api");

    response.send(resp);
});

app.get( '/api/log/:text', function( request, response ) {
    console.log("GET /api/log/*");
    var resp = [
            {
                Application: "watson-pcolazurdo",
                ServiceUrl: service_url,
                Status: "Ok",
                Log: request.params.text
            }
        ];

    response.send(resp);
});

app.post( '/api/log/:text', function( request, response ) {
    console.log("POST /api/log/*");
    var resp = [
            {
                Application: "watson-pcolazurdo",
                ServiceUrl: service_url,
                Status: "Ok",
                Log: request.params.text
            }
        ];

    response.send(resp);
});

app.get( '/api/lid/:text', function( request, response) {
  var request_data = {
    'txt': request.params.text,
    'sid': 'lid-generic',  // service type : language identification (lid)
    'rt':'json' // return type e.g. json, text or xml
  };

  var parts = url.parse(service_url); //service address

  // create the request options to POST our question to Watson
  var options = { host: parts.hostname,
    port: parts.port,
    path: parts.pathname,
    method: 'POST',
    headers: {
      'Content-Type'  :'application/x-www-form-urlencoded', // only content type supported
      'X-synctimeout' : '30',
      'Authorization' :  auth }
  };

  // Create a request to POST to the Watson service
  var watson_req = https.request(options, function(result) {
    result.setEncoding('utf-8');
    var responseString = '';

    result.on("data", function(chunk) {
      responseString += chunk;
    });

    result.on('end', function() {
      try {
        var lang = JSON.parse(responseString).lang;
        return response.send({ 'txt': request.params.text, 'lang': lang });
      }
      catch (e) {
        console.log("Catched Fire on result.on (end)")
        console.log(e);
      }
    })

  });

  // create the request to Watson
  try {
    watson_req.write(querystring.stringify(request_data));
    watson_req.end();
  }
  catch (e) {
    console.log("Catched Fire on watson_req.write")
    console.log(e);
  }
});


app.get( '/api/re/:text', function( request, response) {

});



//
// PAGES
//


// render index page
app.get('/', function(req, res){
    console.log("GET /");
    res.render('index');
});


// Handle the form POST containing the text to identify with Watson and reply with the language
app.post('/', function(req, res){
  console.log("POST /");
  var request_data = {
    'txt': req.body.txt,
    'sid': 'lid-generic',  // service type : language identification (lid)
    'rt':'json' // return type e.g. json, text or xml
  };

  var parts = url.parse(service_url); //service address

  // create the request options to POST our question to Watson
  var options = { host: parts.hostname,
    port: parts.port,
    path: parts.pathname,
    method: 'POST',
    headers: {
      'Content-Type'  :'application/x-www-form-urlencoded', // only content type supported
      'X-synctimeout' : '30',
      'Authorization' :  auth }
  };

  // Create a request to POST to the Watson service
  var watson_req = https.request(options, function(result) {
    result.setEncoding('utf-8');
    var responseString = '';

    result.on("data", function(chunk) {
      responseString += chunk;
    });

    result.on('end', function() {
      var lang = JSON.parse(responseString).lang;
      return res.render('index',{ 'txt': req.body.txt, 'lang': lang });
    })

  });

  watson_req.on('error', function(e) {
    return res.render('index', {'error':e.message})
  });

  // create the request to Watson
  watson_req.write(querystring.stringify(request_data));
  watson_req.end();

});


app.get('/re', function(req, res){
    res.render('re_index');
});




app.get('/status', function(req, res){
	countView( function (countStatus) {
		values = new Array();
		db.view("design1", "timestampView", {"group": true, "reduce": true}, function(err, body) {
			if (!err) {
				body.rows.forEach(function(doc) {
					//console.log(doc);
					values.push ([doc.key, doc.value]);
				});
				countStatus.values = JSON.stringify(values);
			} else {
				countStatus.error = err;
			}
			res.render('status', countStatus);
		});
	});
});




// Handle the form POST containing the text to identify with Watson and reply with the language
app.post('/re', function(req, res){
  try {
    var parts = url.parse(re_service_url);

    // create the request options from our form to POST to Watson
    var options = {
      host: parts.hostname,
      port: parts.port,
      path: parts.pathname,
      method: 'POST',
      headers: {
        'Content-Type'  :'application/x-www-form-urlencoded',
        'X-synctimeout' : '30',
        'Authorization' :  auth }
    };
  }
  catch (e){
    console.log("Error: " + e);
    //res.render('error', {'error': e.message});
  }

  // Create a request to POST to Watson
  try{
    var watson_req = https.request(options, function(result) {
      result.setEncoding('utf-8');
      var resp_string = '';

      result.on("data", function(chunk) {
        resp_string += chunk;
      });

      result.on('end', function() {
        try{
          return res.render('re_index',{'xml':xmlescape(resp_string), 'text':req.body.txt})
        } catch (e){
          console.log("Error: " + e);
          //res.render('error', {'error': e.message});
        }
      })
    });
  } catch (e){
    console.log("Error: " + e);
    //res.render('error', {'error': e.message});
  }

  watson_req.on('error', function(e) {
    return res.render('re_index', {'error':e.message})
  });

  // Wire the form data to the service
  console.log("Query String on RE:" + querystring.stringify(req.body));
  try {
    watson_req.write(querystring.stringify(req.body));
    watson_req.end();
  } catch (e){
    console.log("Error: " + e);
    //res.render('error', {'error': e.message});
  }
});

console.log("Connected to port =" + port + " host =  " + host);
app.listen(port, host);
