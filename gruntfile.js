yaml = require('js-yaml');
fs = require('fs');


module.exports = function(grunt) {
	var pkg = grunt.file.readJSON('package.json');
	grunt.initConfig({
		shell: {
			push: {
				command: function () {
					grunt.log.writeln('Pushing ' + pkg.name + ' to bluemix');
	        return 'cf push '+ pkg.name;
				}
			},
			browserify: {
				command: function () {
					grunt.log.writeln('Browserifying ' + pkg.name);
        	return 'npm run browserify';
				}
			},
			cfpush: {
				command: function () {
					grunt.file.delete ("output.log");
					return 'cf push' ;
				}
			},
			cfstart: {
				command: function () {
					try {
						var doc = JSON.parse(JSON.stringify(yaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'))));
						//console.log(doc);
						return 'cf start ' + doc.applications[0].name;
					} catch (e) {
						console.log(e);
					}
				}
			},
			cfstatus: {
				command: function () {
					try {
						var doc = JSON.parse(JSON.stringify(yaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'))));
						//console.log(doc);
						return 'cf app ' + doc.applications[0].name;
					} catch (e) {
						console.log(e);
					}
					//console.log ('cf app ' + doc.applications[0].name);
				}
			},
			gitstatus: {
				command: function () {
					return 'git status';
				}
			},
			gitadd: {
				command: function () {
					return 'git add .';
				}
			},
			gitcommit: {
				command: function () {
					return 'git commit -a -m "new commit"';
				}
			},
			gitpush: {
				command: function () {
					return 'git push origin master';
				}
			}
		}
	});
	grunt.loadNpmTasks('grunt-git');
	grunt.loadNpmTasks('grunt-shell');
	//grunt.loadNpmTasks('grunt-env');

	// bluemix
	grunt.registerTask('push bluemix', [
		'shell:cfpush',
		'shell:cfstart'
	]);

	grunt.registerTask('deploy', [
		'shell:browserify',
		'shell:push'
	]);

	grunt.registerTask('status', [
		'shell:gitstatus',
		'shell:cfstatus'
	]);

	grunt.registerTask('gitcommit', [
		'shell:gitadd',
		'shell:gitcommit',
		'shell:gitpush'
	]);

	grunt.registerTask('default', ['status']);
};
