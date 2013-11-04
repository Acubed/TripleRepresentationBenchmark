#!/usr/bin/env node --expose-gc
var seed = 1, tripleCount = 7000000, findCount = 100, tests = {};
var fromCharCode = String.fromCharCode;

var rdf = require('rdf');

/* String-based literals */

function createLiteralString(value, type, language) {
  if (type)
    return '"' + value + '"^^<' + type + '>';
  else if (language)
    return '"' + value + '"@' + language;
  else
    return '"' + value + '"';
}


/* Random triple creation */

// Generate random URIs and Literals. The first hundred resources or so will be predicates.
var resources = randomStrings(tripleCount/50, 4, 30, 'http://example.com/');
var literals = randomStrings(tripleCount/50, 10, 100);

// Add types and languages to some literals
for (var i = 0; i < literals.length; i++) {
  var literal = literals[i] = { value: literals[i] };
  if (i % 3 === 1)
    literal.type = randomString(randInt(20, 40));
  else if (i % 3 === 2)
    literal.language = randomString(randInt(2, 5));
}

// Generate subjects, predicates, and objects
var subjects = new Array(tripleCount);
var predicates = new Array(tripleCount);
var objects = new Array(tripleCount);

for (i = 0; i < tripleCount; i++) {
  subjects[i] = resources[randInt(0, resources.length - 1)];
  var weighted = Math.min(Math.floor(Math.log(1-Math.random())/-0.05), randInt(0, resources.length));
  predicates[i] = predicates[weighted];
  objects[i] = (random() < .5) ? resources[randInt(0, resources.length - 1)] : literals[randInt(0, literals.length - 1)];
}


/* Tests */

// Memory comparison with empty test environment
test(0, 'Empty test environment', function() {}, function() {} );

var prototypeTriples;
test(1, 'Generate prototype-based triples', function(){
  executeTest(0);
}, function () {
  prototypeTriples = new rdf.TripletGraph();
  for (var i = 0; i < tripleCount; i++) {
    var object = objects[i];
    prototypeTriples.add(new rdf.Triple(subjects[i],
                                     predicates[i],
                                     object.value ? new rdf.Literal(object.value, object.language, object.type) : object));
  }
});

var objectTriples;
test(2, 'Generate object/string-based triples', function(){
  executeTest(0);
}, function() {
  objectTriples = new Array(tripleCount);
  for (var i = 0; i < tripleCount; i++) {
    var object = objects[i];
    objectTriples[i] = { subject: subjects[i],
                          predicate: predicates[i],
                          object: object.value ? createLiteralString(object.value) : object }
  }
});

test(3, 'Find prototype-based triples with a given subject', function(){
  executeTest(1);
}, function() {
  for (var i = 0; i < findCount; i++) {
    var randomSubject = subjects[randInt(0, subjects.length - 1)];
    var matches = prototypeTriples.match(randomSubject, null, null);
  }
});

test(4, 'Find object/string-based triples with a given subject', function() {
  executeTest(2);
}, function() {
  for (var i = 0; i < findCount; i++) {
    var randomSubject = objectTriples[randInt(0, objectTriples.length - 1)].subject;
    var matches = objectTriples.filter(function (t) {
      return t.subject === randomSubject;
    });
  }
});

test(5, 'Find prototype-based triples with a given object', function () {
  executeTest(1);
}, function() {
  for (var i = 0; i < findCount; i++) {
    var randomObject = objects[randInt(0, objects.length - 1)];
    var matches = prototypeTriples.match(null, null, randomObject);
  }
});

test(6, 'Find object/string-based triples with a given object', function () {
  executeTest(2);
}, function() {
  for (var i = 0; i < findCount; i++) {
    var randomObject = objectTriples[randInt(0, objectTriples.length - 1)].object;
    var matches = objectTriples.filter(function (t) {
      return t.object === randomObject;
    });
  }
});

test(7, 'Check prototype-based triples for literals', function () {
  executeTest(1);
}, function() {
  var matches = prototypeTriples.filter(function (t) {
    return t.object.node;
  });
});

test(8, 'Check object/string-based triples for literals', function () {
  executeTest(2);
}, function() {
  var matches = objectTriples.filter(function (t) {
    return /^"/.test(t.object);
  });
});



/* Utility functions */

// Generates an array of random strings having a minimum and maximum length
function randomStrings(number, minLength, maxLength, prefix) {
  prefix = prefix || "";
  var strings = new Array(number);
  for (var i = 0; i < number; i ++)
    strings[i] = prefix+randomString(randInt(minLength, maxLength));
  return strings;
}

// Generates a random string of the given length
function randomString(length) {
  var chars = new Array(length);
  for (var i = 0; i < length; i++) {
    var char = randInt(0, 61);
    if (char <= 9)
      chars[i] = fromCharCode(48 + char);
    else if (char <= 35)
      chars[i] = fromCharCode(55 + char);
    else
      chars[i] = fromCharCode(61 + char);
  }
  return chars.join('');
}

// Generates a random integer between min and max (boundaries included)
function randInt(min, max) {
  return min + Math.floor((max - min + 1) * random());
}

// Generates a random number with a seed
function random() {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Executes a test if it is selected
function test(id, name, setup, execute) {
  tests[id] = { name:name, setup:setup, test:execute };
  if (id == process.argv[2])
    executeTest(id);
}

// Executes a test
function executeTest(id) {
  global.gc();
  tests[id].setup();
  var startTime = process.hrtime();
  tests[id].test();
  var duration = process.hrtime(startTime);
  console.log(id + '. ' + tests[id].name + ': ' +  (duration[0] + duration[1]/1000000000) + 's',
              Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB');
}
