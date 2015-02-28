"use strict";

var wdk = require('wikidata-sdk');
var breq = require('bluereq');
var _ = require('underscore');

var query = process.argv[2];
var url = wdk.searchEntities(query, 'de', 10);
var initialSearchRequest = breq.get(url);
var visited = []
var root = {}

var verbs = {
  P6: "wird regiert von",
  P7: "hat einen Bruder mit dem Namen",
  P9: "hat eine Schwester mit dem Namen",
  P17: "liegt in",
  P19: "ist geboren in",
  P20: "ist gestorben in",
  P27: "ist Bürger(in) von",
  P69: "besuchte die Universität von",
  P106: "arbeitet als",
  P138: "ist benannt nach",
  P190: "ist die Schwesterstadt von",
  P610: "hat die höchste Erhebung",
}

var initialSearchResults = initialSearchRequest.then(function(response) {
  var result = response.body.search[0];
  console.log(query+' ist '+result.description+'.');
  var url = wdk.getEntities([result.id], 'de');
  return breq.get(url).then(function(response) {
    var firstEntityKey = Object.keys(response.body.entities)[0];
    var firstEntity = response.body.entities[firstEntityKey];
    return firstEntity;
  });
})

var claimRequest = initialSearchResults.then(function(sourceQ) {
  var url = wdk.getReverseClaims('P19', sourceQ.id);
  return breq.get(url).then(function(response) {
    var items = response.body.items;
    var entityId = items[Math.floor(Math.random()*items.length)];
    requestEntity(root, sourceQ, entityId, 'P19').then(function() {
      console.log("Ende.");
    });
  });
});

var requestEntity = function(path, sourceQ, entityId, propId) {
  path = addPath(path, propId, entityId);
  visited.push(entityId);
  var url = wdk.getEntities([entityId], 'de');
  return breq.get(url).then(function(response) {
    var firstEntityKey = Object.keys(response.body.entities)[0];
    var firstEntity = response.body.entities[firstEntityKey];
    writeSentence(sourceQ, propId, firstEntity);
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
    if(verbs[propId]) {
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

  return tryNextEntities(path, source, candidates);
}

var tryNextEntities = function(path, sourceQ, candidates) {
  // debug('candidates', candidates);
  var candidate = candidates.shift();
  if (candidate) {
    return requestEntity(path, sourceQ, candidate.entityId, candidate.propId).then(function() {
      if (candidates.length) {
        return tryNextEntities(path, sourceQ, candidates);
      } else {
      }
    });
  } else {
    path.next = null;
    // debug("end of path");
    return null;
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

function writeSentence(sourceQ, pId, targetQ) {
  var sourceName = extractLabel(sourceQ);
  var propertySentence = verbs[pId];
  var targetName = extractLabel(targetQ);
  var sentence = sourceName + ' ' +  propertySentence + ' ' +  targetName + '.';
  console.log(sentence)
}

function extractLabel(entity){
    if (entity.labels) {
		for(var label in entity.labels){
		    if(entity.labels[label] && entity.labels[label].value){
		    	return entity.labels[label].value;
		    }
		}
    }
	return "Unbekannt";
}
