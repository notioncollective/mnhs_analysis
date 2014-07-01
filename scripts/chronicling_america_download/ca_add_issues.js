var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');


// if (process.argv.length < 3) {
//     console.log("Please add URL");
//     process.exit(0);
// }

var URL = process.argv[2] || 'http://chroniclingamerica.loc.gov/awardees/mnhi.json';
var batches, editions = [],
    pages;
var curBatch = 0,
    numBatches;
var curEdition = 0,
    numEditions = 0;
var curPage = 0,
    numPages;

var numErrors = 0;
var brokenLinks = [];


MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
    if (err) throw err;


    var collection = db.collection("batches");

    var collection = db
        .collection('batches')
        .find({})
        .toArray(function(err, docs) {
            batches = docs;
            var numBatches = batches.length;
            // console.log(numBatches);
            db.close();
            for (var i = 0; i < numBatches; i++) {
                numEditions += batches[i].issues.length;
                // console.log(batches[i].issues);
                editions = editions.concat(batches[i].issues);
            }

            saveDocuments(editions, "editions", wrapUp);

            console.log(editions.length + " total issues");
        });
});

function saveDocuments(documents, collectionName, callback) {
    console.log("saveDocuments");
    var curDocument = 0,
        numDocuments = documents.length;

    saveDocument(documents[curDocument].url, collectionName);

    function saveDocument(url, collectionName) {
    	console.log("saving document: " + url);
        request({
            url: url,
            json: true
        }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
                    if (err) throw err;
                    var collection = db.collection(collectionName);

                    collection.insert(body, function(err, docs) {
                        if (err) {
                            console.log(err);
                        }
                        curDocument += 1;

                        var remaining = numDocuments - curDocument;
                        console.log("Document " + curDocument + " of " + numDocuments + " inserted. " + remaining + " remaining.");

                        db.close();

                        if (curDocument < numDocuments) {
                            saveDocument(documents[curDocument].url, collectionName);
                        } else {
                            if (callback) callback();
                        }
                    });
                });
            } else {
            	// console.log(body);
            	console.log("-------> PROBLEM <-------");
            	numErrors += 1;
            	brokenLinks.push(url);

            	curDocument += 1;

                var remaining = numDocuments - curDocument;
                console.log("Document " + curDocument + " of " + numDocuments + " inserted. " + remaining + " remaining.");

                if (curDocument < numDocuments) {
                    saveDocument(documents[curDocument].url, collectionName);
                } else {
                    if (callback) callback();
                }
            }
        });
    }
}

function wrapUp() {
	console.log("-------> COMPLETE <-------");
	console.log("\n");
	console.log("-------> Errors: " + numErrors + " <-------");
	console.log("\n");
	console.log("-------> DETECTED BROKEN LINKS: <-------");
}
