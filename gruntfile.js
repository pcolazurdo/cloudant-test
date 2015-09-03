yaml = require('js-yaml');
fs = require('fs');

function writeFileSync (file, obj, options) {
	options = options || {}

	var spaces = typeof options === 'object' && options !== null
		? 'spaces' in options
		? options.spaces : this.spaces
		: this.spaces

	var str = JSON.stringify(obj, options.replacer, spaces) + '\n'
	// not sure if fs.writeFileSync returns anything, but just in case
	return fs.writeFileSync(file, str, options)
};

module.exports = function(grunt) {
	var pkg = grunt.file.readJSON('package.json');
	var doc = JSON.parse(JSON.stringify(yaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'))));
	var appName = doc.applications[0].name
	grunt.initConfig({
		shell: {
			push: {
				command: function () {
					grunt.log.writeln('Pushing ' + appName + ' to bluemix');
	        return 'cf push '+ appName;
				}
			},
			test: {
				command: function () {
					grunt.log.writeln('Testing ' + appName);
	        return 'npm test';
				}
			},
			browserify: {
				command: function () {
					grunt.log.writeln('Browserifying ' + appName);
        	return 'npm run browserify';
				}
			},
			cfpush: {
				command: function () {
					grunt.file.delete ("output.log");
					var doc = JSON.parse(JSON.stringify(yaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'))));
					console.log(doc);
					return 'cf push' + appName;
				}
			},
			cfstart: {
				command: function () {
					try {

						//console.log(doc);
						return 'cf start ' + appName;
					} catch (e) {
						console.log(e);
					}
				}
			},
			cfstatus: {
				command: function () {
					try {
						//console.log(doc);
						return 'cf app ' + appName;
					} catch (e) {
						console.log(e);
					}
					//console.log ('cf app ' + doc.applications[0].name);
				}
			}
		}
	});
	grunt.loadNpmTasks('grunt-git');
	grunt.loadNpmTasks('grunt-shell');
	//grunt.loadNpmTasks('grunt-env');

	grunt.registerTask('versionup',"Increment version to actual timestamp", function() {
		var configfile = require('./config.json');
		var newversion = Math.floor(Date.now() / 1000);
		configfile.version = newversion.toString();
		console.log("New app version is ", newversion)
		writeFileSync('config.json', configfile);
	});

	grunt.registerTask('help',"Display helps", function() {
		console.log("You can use grunt deploy to compile/adjust config files/deploy ");
		console.log("or just grunt push to push to bluemix as is");
	});


	// bluemix
	grunt.registerTask('push', [
		'shell:cfpush'
	]);

	// npm
	grunt.registerTask('test', [
		'shell:test'
	]);

	grunt.registerTask('deploy', [
		'test',
		'versionup',
		'shell:browserify',
		'shell:push'
	]);
	grunt.registerTask('default', ['help']);

};
