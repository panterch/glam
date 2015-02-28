"use strict";

var wdk = require('wikidata-sdk');
var breq = require('bluereq');
var _ = require('underscore');

var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);
var initialSearchRequest = breq.get(url);
var visited = []
var root = {}

var templates = {
  5: handleHuman,
  P6: handleHuman, // head of gov
  P7: handleHuman,
  P9: handleHuman,
  P19: handleCity, // place of birth
  P20: handleCity, // place of death
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
  var initialPromise = requestEntity(root, entityId, 'P19').then(function() {
    console.log("story ends here");
  });
});

var requestEntity = function(path, entityId, propId) {
  path = addPath(path, propId, entityId);
  visited.push(entityId);
  var url = wdk.getEntities([entityId], 'de');
  return breq.get(url).then(function(response) {
    var firstEntityKey = Object.keys(response.body.entities)[0];
    var firstEntity = response.body.entities[firstEntityKey];
    writeSentence(firstEntity, propId);
    return discoverNextEntities(path, firstEntity);
  });
}

var discoverNextEntities = function(path, source) {
  // debug('discovering next');
  var propIds = Object.keys(source.claims)
  var ignored = []
  var candidates = []
  for (var i=0; i<propIds.length; i++) {
    var propId = propIds[i];
    var claimContainer =  source.claims[propId][0];
    if (!claimContainer.mainsnak.datavalue) {
      continue;
    }
    var entityId = 'Q'+claimContainer.mainsnak.datavalue.value['numeric-id'];
    if(templates[propId]) {
      if (_.contains(visited, entityId)) {
        ignored.push(entityId+'(v)');
        // console.log('not visiting already used entity', entityId);
      } else {
        candidates.push({propId: propId, entityId: entityId});
      }
    } else {
      ignored.push(propId+entityId+'(u)');
      // debug('dunno what to do with instance ', propId, 'entityId', entityId);
    }
  }

  return tryNextEntities(path, candidates);
}

var tryNextEntities = function(path, candidates) {
  // debug('candidates', candidates);
  var candidate = candidates.shift();
  if (candidate) {
    return requestEntity(path, candidate.entityId, candidate.propId).then(function() {
      if (candidates.length) {
        return tryNextEntities(path, candidates);
      } else {
      }
    });
  } else {
    path.next = null;
    // debug("end of path");
    return null;
  }
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
    console.log('No strategy for', propId);
  }
}

function addPath(path, p, q) {
  path = path.next = { data: p};
  path = path.next = { data: q};
  return path;
}

function pathToArray(path) {
  var rv = [];
  do {
    path = path.next;
    rv.push(path.data);
  } while (path.next);

  return rv;
}

function debug() {

  var args = Array.prototype.slice.call(arguments);
  args.unshift(pathToArray(root).join('->'));
  console.log.apply(console, args);
}
