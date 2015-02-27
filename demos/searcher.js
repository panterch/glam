"use strict";

var wdk = require('wikidata-sdk');
var breq = require('bluereq');


var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);
var initialSearchRequest = breq.get(url);

var initialSearchResults = initialSearchRequest.then(function(response) {
  var result = response.body.search[0];
  console.log(query+' ist '+result.description+'.');
  return result.id;
})

var claimRequest = initialSearchResults.then( function(wdId) {
  var url = wdk.getReverseClaims('P19', wdId);
  return breq.get(url);
});

var entityIdRequest = claimRequest.then(function(response) {
  var items = response.body.items;
  // return items[Math.floor(Math.random()*items.length)];
  items.forEach(function(entityId) {
    requestEntity(entityId);
  });
});

var requestEntity = function(entityId) {
  var url = wdk.getEntities([entityId], 'de');
  breq.get(url).then(function(response) {
    brancher(response);
  });
}

var handleHuman = function(response) {
  var personId = Object.keys(response.body.entities)[0];
  var result = response.body.entities[personId];
  var sentence = "Unbekannte Person";
  if (result.labels && result.labels.de) {
    sentence = result.labels.de.value;
  }
  if (result.descriptions && result.descriptions.de) {
    sentence = sentence +
      ' war/ist ein/e ' +
      result.descriptions.de.value
  }
  sentence = sentence + '.';
  console.log(sentence);
}

var brancher = function(response) {
  var strategies = {
    5: handleHuman
  }
  var firstEntityKey = Object.keys(response.body.entities)[0];
  var firstEntity = response.body.entities[firstEntityKey];
  var instanceOf = firstEntity.claims['P31'][0].mainsnak.datavalue.value['numeric-id'];
  var strategy = strategies[instanceOf];
  if (strategy) {
    strategy(response);
  } else {
    console.log('No strategy for', instanceOf);
  }
}
