/* jshint indent: false */

module.exports = function(grunt) {
  var _ = require('lodash');

  var config = {
    public: 'www/',
    source: 'src/',
    bower: 'bower_components/',
  };

  require('load-grunt-tasks')(grunt);


  grunt.initConfig({

    pkg : grunt.file.readJSON('package.json'),

    config: config,

    watch: {
      bower: {
        files: ['bower.json'],
        tasks: ['wiredep'],
      },
      sass: {
        files: [
          '<%= config.source %>scss/**/*.scss',
        ],
        tasks: ['sass:dev'],
      },
      gruntfile: {
        files: ['Gruntfile.js'],
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>',
        },
        files: [
          '<%= config.public %>/{,**/}*.{html,css,js}',
          '<%= config.public %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
        ],
      },
    },

    sass: {
      dev: {
        files: [
          {
            expand : true,
            cwd    : '<%= config.source %>scss/',
            src    : ['**/*.scss'],
            dest   : '<%= config.public %>css/',
            ext    : '.css',
          },
        ],
      },
    },

    connect: {
      options: {
        port: 9001,
        hostname: '0.0.0.0',
        livereload: 35729
      },
      livereload: {
        options: {
          open: true,
          middleware: function (connect) {
            return [
              connect.static('.tmp'),
              connect().use(
                '/bower_components',
                connect.static('./bower_components')
              ),
              connect().use(
                '/vendor',
                connect.static('./vendor')
              ),
              connect.static(config.public)
            ];
          }
        }
      },
    },

    wiredep: {
      app: {
        src: ['<%= config.public %>/index.html'],
        ignorePath:  /\.\.\//,
      },
      sass: {
        src: ['<%= config.src %>/scss/{,*/}*.scss'],
        ignorePath: /(\.\.\/){1,2}bower_components\//,
      }
    },

    copy: {},

    shell: {},

  });

  grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
    grunt.task.run([
      'wiredep',
      'connect:livereload',
      'watch',
    ]);
  });

};
