/**************************************************************************************************
 *
 * Developed by : Pablo E. Colazurdo
 * Date: Dec 20114
 *
 */

var configApp = require('./config.json');
var log4js = require('log4js');



// Setup logging
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('output.log', null, 10000000, 3, true));
log4js.replaceConsole(); // the important part
var logger = log4js.getLogger();
logger.setLevel(configApp.loggerLevel || "DEBUG");
// End Setup logging

if (process.env.VCAP_SERVICES) {
	logger.info(process.argv);
	logger.info(process.execArgv);
	logger.info(process.env);
}

//Capture all Unhandled Errors - seems not recommended in production so we use
// it only if we aren't in PROD
if (env != 'PROD') {
	process.on('uncaughtException', function(err) {
		setTimeout(function() {
			logger.error("Catched Fire on an Unhandled Error!");
			logger.error(err);
		}, 3000);
	});
}

var express = require('express');
var errorHandler = require('errorhandler');
var bodyParser = require('body-parser');



var url = require('url');
var querystring = require('querystring');
var util = require('util');
var twitter = require('twitter');
var http = require('http');
var https = require('https');
var xmlescape = require('xml-escape');

// Application Modules
var paginate = require('./couchdb-paginate');
var circular = require('./circularCache');


// React
var JSX = require('node-jsx').install();
var React = require('react');
var TweetsApp = React.createFactory(require('./components/TweetsApp.react'));
//var TweetsApp = require('./components/TweetsApp.react');

//detect environment we're running - default is 'DEV'
var env = process.env.NODE_ENV || 'DEV';

logger.info("App Started: " + Date().toString());

// Read config information

//logger.info("Config information: ", configApp);

// setup middleware
var app = express();
app.use(errorHandler());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
	// logger.info('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);
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
				logger.error('The service '+service_name+' is not in the VCAP_SERVICES, did you forget to bind it?');
		  }
		}
	catch (e){
		  setTimeout(function() {
	  	    logger.error("Catched Fire on getting services");
	  	    logger.error(e);
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
	    logger.error('The service '+re_service_name+' is not in the VCAP_SERVICES, did you forget to bind it?');
	  }
	}
	catch (e){
	  setTimeout(function() {
	      logger.error("Catched Fire on getting services");
	      logger.error(e);
	  }, 3000);
	}
}

var host = process.env.VCAP_APP_HOST || '127.0.0.1';
var port = process.env.VCAP_APP_PORT || 3000;

// Retrieve cloudant information from Linux Environment
if (process.env.COUCH_HOST) {
          var cloudant = process.env['COUCH_HOST'];
					logger.info (cloudant);
}

var auth = 'Basic ' + new Buffer(service_username + ':' + service_password).toString('base64');
var re_auth = 'Basic ' + new Buffer(re_service_username + ':' + re_service_password).toString('base64');


logger.info('service_url = ' + service_url);
logger.info('service_username = ' + service_username);
logger.info('service_password = ' + new Array(service_password.length).join("X"));
logger.info('re_service_url = ' + re_service_url);
logger.info('re_service_username = ' + re_service_username);
logger.info('re_service_password = ' + new Array(re_service_password.length).join("X"));
logger.info('cloudant = ' + cloudant);

// Setup Cloudant connection
if (cloudant) {
	var nano = require('nano')(cloudant);
	var db_name = "twitter";
	//try creating the database. If it already exists it will log a message.
	nano.db.create(db_name, function (error, body, headers) {
    if(error) {
			logger.error ("Error while creating the database " + db_name);
			logger.error (error.message);
			logger.error (error['status-code']);
		}
	});
	var db = nano.use(db_name);
}



// Function to insert a new Doc into the Cloudant database
function insert_doc(doc) {
	if (cloudant) {
		logger.debug("insert_doc() doc:", doc);
	  db.insert(doc, function (error,http_body,http_headers) {
	      if(error) return logger.error(error);
	    });
      // logger.debug("insert_doc() http_body:", http_body);
		}
}

// Function to count documents in the db
function countView(callback) {
	var count = 0;
	var lastTimeStamp = 0;
	var status;
	db.view("design1", "countView", {"group": true, "reduce": true}, function(err, body) {
		if (err) {
			logger.error(err);
			status = {'error': err};
		} else {
			//logger.debug("countview() body:", body);
			body.rows.forEach(function(doc) {
				count = doc.value;
			});
			db.view("design1", "lastTimeView", {"limit": 1, "descending": true}, function(err, body) {
				if (err) {
					logger.error(err);
					status = {'error': err};
				} else {
					//logger.debug(countview() body-2:", body);
					body.rows.forEach(function(doc) {
						//logger.debug("countview() doc:", doc);
						var date = new Date(parseInt(doc.key));
						status = {'count': count, 'lasttimestamp': date};
					});
				}
				callback(status);
			}
		);}
	});
}

var configTwitter = require('./twitter-cred.json');
var twit = new twitter(configTwitter);

function setupTwitter() {
	// TODO: Get application information and use it in your app.
	// var twitterInfo = JSON.parse(process.env.TWITTER_INFO || "{}");

  logger.info("setupTwitter() - init");
	twit = new twitter(configTwitter);
	var lastUpdated = Date.now();
	twit.stream('user', {track: configApp.track}, function(stream) {
	    stream.on('data', function(data) {
					lastUpdated = Date.now();
	        logger.debug("twit.stream(user) data.taget_object:", typeof data.target_object);
					logger.debug("twit.stream(user) data.id_str:", typeof data.id_str);
					logger.debug("twit.stream(user) inspect(data):", util.inspect(data));
					logger.info("New tweet OK");
					// Only insert tweets
					if (typeof data.id_str !== 'undefined') insert_doc(data);
	    });
			stream.on('error', function(data) {
					logger.error("twit.stream(user) Stream Error: ", util.inspect(data));
			});
			stream.on('done', function(data) {
				logger.error("twit.stream(user) Stream done: ", util.inspect(data));
			});
			stream.on('end', function(data) {
				logger.error("twit.stream(user) Stream end: ", util.inspect(data));
			});
	    //stream.on('favorite', function(data) {
	    //    logger.debug(data.target_object.text);
	    //    insert_doc(data, data.target_object.id_str, function (err, response) {
	    //        logger.debug(err || response);
	    //      });
	    //});
	    // Disconnect stream after five seconds
	    //setTimeout(stream.destroy, 5000);

			var setupTwitterTimer = setInterval(function() {
				if ( Date.now() - lastUpdated > 300000) { //More than 5 mins
					logger.error("No new twitter updates since", lastUpdated, "so quitting ...");
					//setupTwitter();
					//process.exit(1);
					stream.destroy();
					clearInterval(setupTwitterTimer);
					setupTwitter();
				}
			}, 300000);

	});
}


//
// PAGES
//

app.get('/status0', function(req, res){
	//logger.debug("GET /");
	res.render('status0');
});

app.get('/status', function(req, res){
	countView( function (countStatus) {
		values = new Array();
		db.view("design1", "timestampView", {"group": true, "reduce": true}, function(err, body) {
			if (!err) {
				body.rows.forEach(function(doc) {
					//logger.debug("/status: timeStampView", doc);
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

app.get("/json/hashtags.json", function (req,res) {
	var values = {'name': "hashtags", 'children': []};
	db.viewWithList("design1", "hashTagView", "sortList", {"group": true, "reduce": true}, function(err, data) {

		if (!err) {
			data.rows.forEach(function(doc) {
				//logger.debug(doc);
				values.children.push ( {'name': doc.key, 'size': doc.value} );
				//logger.debug({'key': doc.key, 'value': doc.value});
			});
		} else {
			res.json(err);
		}
		res.json(values);
	});
});

app.get("/json/geo.json", function (req,res) {
	var values = {'type': "FeatureCollection", 'features': []};
	db.view("design1", "geoView", {"group": true, "reduce": true}, function(err, data) {
		if (!err) {
			data.rows.forEach(function(doc) {
				// Avoid returning places with just 1 hit
				//if (doc.value && doc.value > 1) {
				if (doc.value) {
					if (doc.key.coordinates)
							coord = doc.key.coordinates;
					else
							coord = doc.key.place.coordinates;

					if (coord && coord.coordinates) {
						coord.coordinates = coord.coordinates.map( function (num) {
							//logger.debug(num);
							str = num.toString();
							//str = str.substring(0,str.length-2);
							//logger.debug(str);
							return parseFloat(str);
						});
						values.features.push ( {'type': 'Feature', 'geometry':  coord , 'properties': {'size': doc.value}  } );
					}
				}
			});
		} else {
			res.json(err);
		}
		res.json(values);
	});
});

app.get("/tweets/:start?",
	paginate( {
		database: db,
		pageSize: 10,
		design: "design1",
		view: "lastTimeView",
		//asJson: true,
		options: {
			"include_docs": true,
			"reduce": false,
			"descending": true
		}
	}), function (req, res, next) {
		var status = {};
		var tweets = [];
		//status.documents = req.documents;
		req.documents.forEach(function(doc) {
			logger.debug("app.get(tweets) Doc: ", doc);
			try {
				if (doc.doc.text) {
					tweets.push( {
						avatar     : doc.doc.user.profile_image_url,
						body       : doc.doc.text,
						//date       : new Date(Math.round(doc.doc.timestamp_ms/1000)),
						date       : doc.doc.created_at,
						screenname : doc.doc.user.screen_name
					});
				}
			}
			catch (e) {
  		  setTimeout(function() {
      	    logger.error("Invalid doc format on /tweets/", doc);
      	    logger.error(e);
  		  }, 3000);
			}
		});
		status.documents = tweets;
		status.nextIds = req.nextIds;
		//logger.debug(status);
		res.json(status);
	}
);

app.get("/", function (req,res) {
	var options = {
		path: '/tweets/',
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	};
	localUrl = url.parse(req.headers.host);
	//logger.debug("localUrl: ", localUrl);
	//logger.debug("req: ", req.headers);
	if (localUrl.protocol == 'localhost:') {
		options.hostname = 'localhost';
		options.port = parseInt(localUrl.host);
	} else {
		if (localUrl.protocol === null && localUrl.hostname === null) {
			options.hostname = localUrl.href;
			options.port = 80;
		}
	}

	var reqA = http.request(options, function(resA) {
		resA.setEncoding('utf8');
		var completeData = "";
		resA.on('data', function (data) {
				completeData += data;
			});
		resA.on('end', function () {
				var jsonData = JSON.parse(completeData);
				var markup = React.renderToString(
					TweetsApp({
						tweets: jsonData
					})
				);
				//logger.debug("Markup:", markup, typeof(markup));
				res.render('main', {
					markup: markup, // Pass rendered react markup
					state: JSON.stringify(jsonData) // Pass current state to client side
				});
			});
		});
		reqA.end();
		// Render our 'home' template
});

app.get('/api/logrequest', function(req, res){
	circular.addItem(req);
	res.status(200).send("Logged OK");
});

app.get('/api/getrequests', function(req, res){
	res.set('Content-Type', 'text/html');
	var buffer = "";
	buffer += "<!doctype html><HEAD></HEAD><BODY>";
	circular.getItems().map(function (a) {
		buffer += util.inspect(a, { showHidden: true, depth: 5 }).replace(/[\n\r]/g, '<br />\n');
	});
	buffer +=	"</BODY>" ;
	res.send(buffer);
	//console.log("getrequests", typeof(x), x);
	//res.json(x);
	//res.status(200).send(circular.getItems().toString());
});

app.get('/getrequests', function(req, res){
	//circular.getItems().map(function (a) {
	//	buffer += util.inspect(a, { showHidden: true, depth: 5 }).replace(/[\n\r]/g, '<br />\n');
	//});

	res.render('getrequests', { "values": circular.getItems().map(function (x) {
			return util.inspect(x, { showHidden: true, depth: 5 });
			//.replace(/[\n\r]/g, '<br />\n');
			//.replace(/[\s]/g, '&nbsp;');
		})
	});
	//console.log("getrequests", typeof(x), x);
	//res.json(x);
	//res.status(200).send(circular.getItems().toString());
});

// Status Watcher to check if Twitter stream is working - if not it restarts the twitter stream.
setInterval(function() {
	//logger.info("Checking twitter connection Status");
	var lastUpdated;
	db.view("design1", "lastTimeView", {"limit": 1, "descending": true}, function(err, body) {
		if (err) {
			logger.error(err);
		} else {
			//logger.debug(body);
			body.rows.forEach(function(doc) {
				lastUpdated = new Date(parseInt(doc.key));
			});
			//logger.debug("Time Diff between lastUpdated and now", Date.now() - lastUpdated);
			if ( Date.now() - lastUpdated > 300000) { //More than 5 mins
				logger.error("No new twitter updates since", lastUpdated, "so quitting ...");
				//setupTwitter();
				process.exit(1);
			}
		}
	});
}, 300000);

app.get("/test", function (req, res) {
	var doc1 = {
		"created_at": 'Fri Aug 29 14:40:21 +0000 2015',
		"id": 1,
		"id_str": '1',
		"text": 'SAMPLE ERROR',
		"source": 'SAMPLE ERROR',
		"truncated": false,
		"timestamp_ms": "1540781840814",
		"in_reply_to_status_id": null,
		"in_reply_to_status_id_str": null,
		"in_reply_to_user_id": null,
		"in_reply_to_user_id_str": null,
		"in_reply_to_screen_name": null
	};
	insert_doc(doc1);
	res.send("Document Inserted");
})



logger.info("Connected to port =" + port + " host =  " + host);
setupTwitter();
app.listen(port, host);
