"use strict";

var wdk = require('wikidata-sdk');
var _ = require('underscore');
var md5 = require('MD5');
var Promise = require('bluebird');

// var query = null;
// var run = function() {
//   if (process.argv) {
//     query = process.argv[2];
//   } else {
//     query = 
//   }
// }
// var query = process.argv[2];
// var query = 'Zürich';
var proxyUrl = function(url) {
  return 'https://jsonp.nodejitsu.com/?url=' + encodeURIComponent(url);
};

function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
}

var getUrl = function(url) {
  var current = Promise.pending();
  var xhr = createCORSRequest('GET', url);
  xhr.onload = function() {
    console.log(JSON.parse(xhr.responseText));
    current.resolve({body: JSON.parse(xhr.responseText)});
  }
  xhr.send();
  return current.promise;
};

var visited = [];
var root = {};

var verbs = {
  P6: "wird regiert von",
  P7: "hat einen Bruder mit dem Namen",
  P9: "hat eine Schwester mit dem Namen",
  P17: "liegt in",
  P19: "ist geboren in",
  P20: "ist gestorben in",
  P26: "ist verheiratet mit",
  P27: "ist Bürger(in) von",
  P69: "besuchte die Universität von",
  P106: "arbeitet als",
  P138: "ist benannt nach",
  P190: "ist die Schwesterstadt von",
  p166: "erhielt die Auszeichnung",
  p569: "ist geboren am",
  p570: "ist gestorben am",
  P610: "hat die höchste Erhebung",
};

window.run = function(query) {
  visited = [];
  root = {};

  var url = proxyUrl(wdk.searchEntities(query, 'de', 10));
  var initialSearchRequest = getUrl(url);  

  var initialSearchResults = initialSearchRequest.then(function(response) {
    var result = response.body.search[0];
    pushDataToUi({text: query+' ist '+result.description+'.'});
    var url = proxyUrl(wdk.getEntities([result.id], 'de'));
    return getUrl(url).then(function(response) {
      var firstEntityKey = Object.keys(response.body.entities)[0];
      var firstEntity = response.body.entities[firstEntityKey];
      return firstEntity;
    });
  })

  var claimRequest = initialSearchResults.then(function(sourceQ) {
    var url = proxyUrl(wdk.getReverseClaims('P19', sourceQ.id));
    return getUrl(url).then(function(response) {
      var qIds = _.shuffle(response.body.items);
      var qId = qIds.shift();
      requestEntity(root, sourceQ, qId, 'P19').then(function() {
        console.log("Ende.");
      });
    });
  });
};




var requestEntity = function(path, sourceQ, entityId, propId) {
  path = addPath(path, propId, entityId);
  visited.push(entityId);
  var url = proxyUrl(wdk.getEntities([entityId], 'de'));
  return getUrl(url).then(function(response) {
    var qId = Object.keys(response.body.entities)[0];
    var q = response.body.entities[qId];
    var sentence = buildSentence(sourceQ, propId, q);
    var image = extractImage(q);
    pushDataToUi({
      text: sentence,
      image: image
    });
    return discoverNextEntities(path, q);
  });
}

var discoverNextEntities = function(path, source) {
  var propIds;
  if(source && source.claims){
	  propIds = Object.keys(source.claims)
  } else {
	  propIds = []
  }
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
  candidates = _.shuffle(candidates);
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

function buildSentence(sourceQ, pId, targetQ) {
  var sourceName = extractLabel(sourceQ);
  var propertySentence = verbs[pId];
  var targetName = extractLabel(targetQ);
  var sentence = sourceName + ' ' +  propertySentence + ' ' +  targetName + '.';
  return sentence;
}

function extractImage(q) {
  var claim = q.claims['P18'];
  if (!claim) { return undefined; }
  var file = claim[0].mainsnak.datavalue.value;
  file = file.replace(/ /g, '_');
  var hash = md5(file);
  file = encodeURIComponent(file);
  var url = 'http://upload.wikimedia.org/wikipedia/commons/'+hash[0]+'/'+hash[0]+hash[1]+'/'+file;
  return url;
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

function pushDataToUi(data) {
  if (typeof window !== 'undefined') {
    if (!window.statements) {
      window.statements = [];
    }
    window.statements.push(data);
  }
  if (typeof console !== 'undefined') {
    console.log(data);
  }
}
