#!/bin/bash

browserify demos/searcher.js -r wikidata-sdk:request:bluereq:underscore -o rabbit/www/js/bundle.js --debug
cp -r rabbit/www/ dist/
cp -r rabbit/bower_components dist/bower_components
divshot push
