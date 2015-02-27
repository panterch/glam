"use strict";

var wdk = require('wikidata-sdk');
var breq = require('bluereq');
var _ = require('underscore');
var visited = [];

var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);
var initialSearchRequest = breq.get(url);

var templates = {
  5: handleHuman,
  P19: handleCity, // place of birth
  P20: handleCity, // place of death
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
  visited.push(entityId);
  var url = wdk.getEntities([entityId], 'de');
  breq.get(url).then(function(response) {
    var firstEntityKey = Object.keys(response.body.entities)[0];
    var firstEntity = response.body.entities[firstEntityKey];
    writeSentence(firstEntity);
    discoverNextEntity(firstEntity);
  });
}

var discoverNextEntity = function(entity) {
  var propIds = Object.keys(entity.claims)
  propIds.forEach(function(propId) {
    var claimContainer =  entity.claims[propId][0];
    var entityId = 'Q'+claimContainer.mainsnak.datavalue.value['numeric-id'];
    if(templates[propId]) {
      if (_.contains(visited, parseInt(entityId))) {
        console.log('not visiting already used entity', entityId, visited);
      } else {
        return requestEntity(entityId);
      }
    } else {
      // console.log('dunno what to do with instance ', propId, 'entityId', entityId);
    }
  });
}

function handleHuman(entity) {
  var sentence = "("+entity.id+") ";
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

function handleCity(entity) {
  var sentence = "("+entity.id+")";
  sentence = sentence + entity.descriptions.de.value;
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
