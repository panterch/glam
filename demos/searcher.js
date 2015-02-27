"use strict";

var wdk = require('wikidata-sdk');
var breq = require('bluereq');
var _ = require('underscore');

var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);
var initialSearchRequest = breq.get(url);
var visited = []

var templates = {
  5: handleHuman,
  P19: handleCity, // place of birth
  P20: handleCity, // place of death
  P6: handleHuman, // head of gov
  P190: handleCity, // sister city

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
  requestEntity(entityId, 'P19');
});

var requestEntity = function(entityId, propId) {
  visited.push(entityId);
  var url = wdk.getEntities([entityId], 'de');
  breq.get(url).then(function(response) {
    var firstEntityKey = Object.keys(response.body.entities)[0];
    var firstEntity = response.body.entities[firstEntityKey];
    writeSentence(firstEntity, propId);
    discoverNextEntity(firstEntity);
  });
}

var discoverNextEntity = function(entity) {
  var propIds = Object.keys(entity.claims)
  propIds.forEach(function(propId) {
    var claimContainer =  entity.claims[propId][0];
    var entityId = 'Q'+claimContainer.mainsnak.datavalue.value['numeric-id'];
    if(templates[propId]) {
      if (_.contains(visited, entityId)) {
        console.log('not visiting already used entity', entityId);
      } else {
        return requestEntity(entityId, propId);
      }
    } else {
      // console.log('dunno what to do with instance ', propId, 'entityId', entityId);
    }
  });
}

function handleHuman(entity, propId) {
  var sentence = "("+entity.id+"/"+propId+") ";
  if (entity.labels && entity.labels.de) {
    sentence = sentence + entity.labels.de.value;
  }
  if (entity.descriptions && entity.descriptions.de) {
    sentence = sentence +
      ' war/ist ein/e ' +
      entity.descriptions.de.value
  }
  sentence = sentence + '.';
  console.log(sentence);
}

function handleCity(entity, propId) {
  handleHuman(entity, propId);
}

var writeSentence = function(entity, propId) {
  var strategy = templates[propId];
  if (strategy) {
    strategy(entity, propId);
  } else {
    console.log('No strategy for', instanceOf);
  }
}
