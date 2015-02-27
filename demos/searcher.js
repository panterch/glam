"use strict";

var wdk = require('wikidata-sdk');
var breq = require('bluereq');


var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);
var initialSearchRequest = breq.get(url);

var templates = {
  5: handleHuman
}

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
  var entityId = items[Math.floor(Math.random()*items.length)];
  requestEntity(entityId);
});

var requestEntity = function(entityId) {
  var url = wdk.getEntities([entityId], 'de');
  breq.get(url).then(function(response) {
    var firstEntityKey = Object.keys(response.body.entities)[0];
    var firstEntity = response.body.entities[firstEntityKey];
    writeSentence(firstEntity);
    discoverNextEntity(firstEntity);
  });
}

var discoverNextEntity = function(entity) {
  var claims = Object.keys(entity.claims)
  claims.forEach(function(claim) {
    var claimContainer =  entity.claims[claim][0];
    var instanceId =claimContainer.mainsnak.datavalue.value['numeric-id'];
    if(templates[instanceId]) {
      var entityId = claimContainer.id.split('$')[0];
      return requestEntity(entityId);
    }
  });
}

function handleHuman(entity) {
  var sentence = "Unbekannte Person";
  if (entity.labels && entity.labels.de) {
    sentence = entity.labels.de.value;
  }
  if (entity.descriptions && entity.descriptions.de) {
    sentence = sentence +
      ' war/ist ein/e ' +
      entity.descriptions.de.value
  }
  sentence = sentence + '.';
  console.log(sentence);
}

var writeSentence = function(entity) {
  var instanceOf = entity.claims['P31'][0].mainsnak.datavalue.value['numeric-id'];
  var strategy = templates[instanceOf];
  if (strategy) {
    strategy(entity);
  } else {
    console.log('No strategy for', instanceOf);
  }
}
