var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');


// if (process.argv.length < 3) {
//     console.log("Please add URL");
//     process.exit(0);
// }

var URL = process.argv[2] || 'http://chroniclingamerica.loc.gov/awardees/mnhi.json';
var batches, editions, pages;
var curBatch = 0, numBatches;
var curEdition = 0, numEditions;
var curPage = 0, numPages;


// getEditions();
saveBatches(URL);


function saveBatch(url) {
	request({
        url: url,
        json: true
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
                if (err) throw err;

                var collection = db.collection('batches');

                collection.insert(body, function(err, docs) {
                    if (err) {
                        console.log(err);
                    }
                	curBatch += 1;
                	var remaining = numBatches - curBatch;
                    console.log("Batch inserted. " + remaining + " remaining.");

                    db.close();

                    if (curBatch < numBatches) {
                    	// console.log("hello?");
                    	saveBatch(batches[curBatch].url);
                    }
                });
            });
        }
    });
}

function saveBatches(url) {
    request({
        url: url,
        json: true
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            batches = body.batches;
            numBatches = batches.length;
            console.log(batches);

            saveBatch(batches[curBatch].url);
        }
    });
}

function saveDocuments(url, rootKey, collection) {
	var curDocument = 0, numDocuments;
	
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
            console.log(documents);

            saveDocument(documents[curDocument].url, collection);
        }
    });

	function saveDocument(url, collection) {
		request({
	        url: url,
	        json: true
	    }, function(error, response, body) {
	        if (!error && response.statusCode == 200) {
	            MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
	                if (err) throw err;

	                var collection = db.collection(collection);

	                collection.insert(body, function(err, docs) {
	                    if (err) {
	                        console.log(err);
	                    }
	                	
	                	console.log('document insterted');

	                	db.close();

	                	if (curDocument < numDocuments) {
	                    	saveDocument(documents[curDocument].url);
	                    }
	                });
	            });
	        }
	    });
	}
}



function saveEdition(url) {
	request({
        url: url,
        json: true
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
                if (err) throw err;

                var collection = db.collection('batches');

                collection.insert(body, function(err, docs) {
                    if (err) {
                        console.log(err);
                    }
                	curBatch += 1;
                	var remaining = numBatches - curBatch;
                    console.log("Batch inserted. " + remaining + " remaining.");

                    db.close();

                    if (curBatch < numBatches) {
                    	// console.log("hello?");
                    	saveBatch(batches[curBatch].url);
                    }
                });
            });
        }
    });
}

function getEditions() {
	MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var collection = db.collection('batches');

        var cursor = collection.find({});

        cursor.each(function(err, doc) {
            if (err) {
                console.log(err);
            }
            if (doc == null) {
            	db.close();
            } else {
            	console.log(doc.url);
            }
        });

        // db.close();
    });
}