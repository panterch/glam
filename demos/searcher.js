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

var personIdRequest = claimRequest.then( function(response) {
  var items = response.body.items;
  return items[Math.floor(Math.random()*items.length)];
});

var personRequest = personIdRequest.then(function(personId) {
  var url = wdk.getEntities([personId], 'de');
  return breq.get(url);
});


personRequest.then(function(response) {
	brancher(response);
  var personId = Object.keys(response.body.entities)[0];
  var result = response.body.entities[personId];
  var sentence = 'Dort lebte ' +
    result.labels.de.value +
    ' ein(e) ' +
    result.descriptions.de.value +
    '.\nEnde.';
  console.log(sentence);
});


var brancher = function(response) {
	var expression = response.body.entities[Object.keys(response.body.entities)].claims['P31'][0].mainsnak.datavalue.value['numeric-id'];
	switch(expression){
	case 5:
    	// call human path
		console.log('this is a human!');
        break;
    default:
        // call other path 
	}			
}