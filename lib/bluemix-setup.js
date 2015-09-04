// Get application config
var fs = require('fs'),
  path = require('path')

var logger = require(path.join(process.cwd(), './lib/logging')).logger;



// There are many useful environment variables available in process.env.
// VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
// TODO: Get application information and use it in your app.

// defaults for dev outside bluemix
 var service_url = '';
 var service_username = '';
 var service_password = '';
 var re_service_url = '';
 var re_service_username = '';
 var re_service_password = '';
// var cloudant = '';

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


var auth = 'Basic ' + new Buffer(service_username + ':' + service_password).toString('base64');
var re_auth = 'Basic ' + new Buffer(re_service_username + ':' + re_service_password).toString('base64');

logger.info('service_url = ' + service_url);
logger.info('service_username = ' + service_username);
logger.info('service_password = ' + new Array(service_password.length).join("X"));
logger.info('re_service_url = ' + re_service_url);
logger.info('re_service_username = ' + re_service_username);
logger.info('re_service_password = ' + new Array(re_service_password.length).join("X"));
logger.info('cloudant = ' + cloudant);


module.exports = {
	cloudant: cloudant
};
