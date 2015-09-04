var fs = require('fs'),
  path = require('path')

var configApp = require(path.join(process.cwd(), 'config.json'));
var logging = module.exports = {};

var log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('output.log', null, 10000000, 3, true));
log4js.replaceConsole(); // the important part
var logger = log4js.getLogger();
logger.setLevel(configApp.loggerLevel || "DEBUG");

module.exports = {
  logger: logger
};
