var fs = require('fs'),
  path = require('path');

var logger = require(path.join(process.cwd(),'./lib/logging')).logger;
var util = require('util');
var router = new require("express").Router();
var circular = require(path.join(process.cwd(),'./lib/circularCache'));
var configApp = require(path.join(process.cwd(), '/lib/circularCache'));

function logrequest(req, res, next) {
  logger.debug("logrequest req:", req);
  circular.addItem(req);
  res.status(200).send("Logged OK");
  next();
}

function getrequests(req, res, next) {
	res.set('Content-Type', 'text/html');
	var buffer = "";
	buffer += "<!doctype html><HEAD></HEAD><BODY>";
  logger.debug("getrequests: ", circular.getItems());
	circular.getItems().map(function (a) {
		buffer += util.inspect(a, { showHidden: false, depth: 5 }).replace(/[\n\r]/g, '<br />\n');
	});
	buffer +=	"</BODY>" ;
	res.send(buffer);
  next();
}

//TODO: create a real API !
router.put("/requests", logrequest);
router.get("/requests", getrequests);

module.exports = router;
