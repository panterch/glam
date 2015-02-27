"use strict;"

var wdk = require('wikidata-sdk')
var request = require('request');


var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);

request(url, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    var result = JSON.parse(body);
    console.log(query+' ist '+result.search[0].description+'.');

    var url = wdk.getReverseClaims('P19', 'Q70');
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        result = JSON.parse(body);
        personId = result.items[Math.floor(Math.random()*result.items.length)];

        var url = wdk.getEntities([personId], 'de');
        request(url, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            result = JSON.parse(body).entities['Q'+personId];
            var person = 'Dort lebte ' +
              result.labels.de.value +
              ' ein ' +
              result.descriptions.de.value +
              '. Ende.';
            console.log(person);
          }
        });
      }
    });
  }
});
