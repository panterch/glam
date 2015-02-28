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
  P6:   true, // head of gov
  P7:   true, // brother
  P9:   true, // sister
  P26:  true, //spouse
  P19:  true, // place of birth
  P20:  true, // place of death
  P190: true, // sister city
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
      console.log("story ends here");
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
  var sourceName = "";
  if (sourceQ.labels && sourceQ.labels.de) {
	  if(sourceQ.labels.de.value){
		  sourceName = sourceQ.labels.de.value;
	  } else {
		  sourceName = sourceQ.labels.en.value;
	  }
  }

  var propertySentence = resolvePropertySentence(pId);

  var targetName = "";
  if (targetQ.labels && targetQ.labels.de) {
	  if(targetQ.labels.de.value){
		  targetName = targetQ.labels.de.value
	  } else {
		  targetName = targetQ.labels.en.value;
	  }
  }
  var sentence = sourceName + ' ' +  propertySentence + ' ' +  targetName + '.';
  console.log(sentence)
}


var resolvePropertySentence = function(pId) {
	switch (pId) {
	  case 'P6':
	  	return "regiert";
		  break;
	  case 'P7':
	  	return "hat einen Bruder mit dem Namen";
		  break;
	  case 'P9':
	  	return "hat eine Schwester mit dem Namen";
		  break;
	  case 'P19':
		  return "ist geboren in";
		  break;
	  case 'P20':
		  return "ist gestorben in";
		  break;
	  case 'P27':
		  return "ist Bürger(in) von";
		  break;
	  case 'P69':
		  return "besuchte die Universität von";
		  break;
	  case 'P106':
		  return "arbeitet als";
		  break;
	  case 'P190':
		  return "ist die Schwesterstadt von";
		  break;

	  default:
	    //Statements executed when none of the values match the value of the expression
      return "?"+pId+"?";
      break;
	}
}
