var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');


// if (process.argv.length < 3) {
//     console.log("Please add URL");
//     process.exit(0);
// }

var URL = process.argv[2] || 'http://chroniclingamerica.loc.gov/awardees/mnhi.json';
var batches, editions, pages;
var curBatch = 0,
    numBatches;
var curEdition = 0,
    numEditions;
var curPage = 0,
    numPages;


saveEditions();
// saveDocuments(URL, "batches", "batches");

function saveEditions() {
	var batches;
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;
        var collection = db.collection("batches");

        var collection = db
            .collection('batches')
            .find({})
            .toArray(function(err, docs) {
                batches = docs;
                db.close();
                console.log(batches);
            });
    });
}




function saveDocuments(url, rootKey, collectionName, callback) {
    var curDocument = 0,
        numDocuments;

    request({
        url: url,
        json: true
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            if (rootKey) {
                documents = body[rootKey];
            } else {
                documents = body;
            }
            numDocuments = documents.length;
            console.log(numDocuments);
            saveDocument(documents[curDocument].url, collectionName);
        }
    });

    function saveDocument(url, collectionName) {
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
                        console.log("Document inserted. " + remaining + " remaining.");

                        db.close();

                        if (curDocument < numDocuments) {
                            saveDocument(documents[curDocument].url, collectionName);
                        } else {
                        	if (callback) callback();
                        }
                    });
                });
            }
        });
    }
}
