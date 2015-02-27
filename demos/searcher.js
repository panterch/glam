"use strict;"

var wdk = require('wikidata-sdk')
var request = require('request');


var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);

request(url, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    result = JSON.parse(body);
    console.log(query+' ist '+result.search[0].description+'!');
    console.log(result.search);
  }
});
