yaml = require('js-yaml');
fs = require('fs');


module.exports = function(grunt) {
	grunt.initConfig({
		shell: {			
			cfpush: {
				command: function () {
					return 'cf push' ;
				}
			},	   
			cfstart: {
				command: function () {
					return 'cf start';
				}
			},
			cfstatus: {
				command: function () {
					try {
						var doc = JSON.parse(JSON.stringify(yaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8'))));
						//console.log(doc);						
					} catch (e) {
						console.log(e);
					}
					//console.log ('cf app ' + doc.applications[0].name);
					return 'cf app ' + doc.applications[0].name;
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
		'push bluemix'		
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



