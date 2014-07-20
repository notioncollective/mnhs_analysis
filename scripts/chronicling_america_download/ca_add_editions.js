/**
 * This script loops through the local "batches" collection in mongodb. Each batch contains a list of edition URLs, which are concatonated
 * into one large list of all editions in all batchs. This list is then looped over, fetching the specified issue data from chroniclingamerica.org
 * and storing it in a new collection called "editions".
 * 
 * Note: In the context of these archives, the term 'edition' is synonomous with 'issue'
 * 
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');

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


// Open the local mongodb and add all of the editions (called 'issues' in the batches array) 
// in each batch to a single "editions" array.
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

            // Add the editions (aka issues) in each batch to the complete list.
            for (var i = 0; i < numBatches; i++) {
                numEditions += batches[i].issues.length;
                // console.log(batches[i].issues);
                i = editions.concat(batches[i].issues);
            }

            // we now have the complete list of edition URLs, let's go get the actual data.
            saveDocuments(editions, "editions", wrapUp);

            console.log(editions.length + " total issues");
        });
});

/**
 * Because we're using a single mongo connection, we need to make each write synchronously.
 * So we keep track of the current document as we're going along. Given the array of document 
 * URLs, we fetch the data from the first one, save it in Mongo, then on successful save we
 * move on to the next document.
 * 
 * @param  {[type]}   documents      [description]
 * @param  {[type]}   collectionName [description]
 * @param  {Function} callback       [description]
 * @return {[type]}                  [description]
 */
function saveDocuments(documents, collectionName, callback) {
    console.log("saveDocuments");
    var curDocument = 0,
        numDocuments = documents.length;

    saveDocument(documents[curDocument].url, collectionName);

    // Saves an individual document
    function saveDocument(url, collectionName) {
    	console.log("saving document: " + url);

        // fetch the data
        request({
            url: url,
            json: true
        }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                // 
                // Successfully fetched, store the data:
                // 
                MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
                    if (err) throw err;
                    var collection = db.collection(collectionName);

                    collection.insert(body, function(err, docs) {
                        if (err) {
                            console.log(err);
                        }

                        // 
                        // Successfully stored
                        // 
                        curDocument += 1;

                        var remaining = numDocuments - curDocument;
                        console.log("Document " + curDocument + " of " + numDocuments + " inserted. " + remaining + " remaining.");

                        db.close();

                        // Move on to next doc if there is on.
                        if (curDocument < numDocuments) {
                            saveDocument(documents[curDocument].url, collectionName);
                        } else {
                            if (callback) callback();
                        }
                    });
                });
            } else {
            	// 
                // Problem fetching the data, log it
                // 
            	console.log("-------> PROBLEM <-------");
            	numErrors += 1;
            	brokenLinks.push(url);

            	curDocument += 1;

                var remaining = numDocuments - curDocument;
                console.log("Document " + curDocument + " of " + numDocuments + " inserted. " + remaining + " remaining.");

                // Even though there has been a problem, we still want to move onto the next doc if there is one.
                if (curDocument < numDocuments) {
                    saveDocument(documents[curDocument].url, collectionName);
                } else {
                    if (callback) callback();
                }
            }
        });
    }
}

/**
 * Just prints the stats for the run.
 */
function wrapUp() {
	console.log("-------> COMPLETE <-------");
	console.log("\n");
	console.log("-------> Errors: " + numErrors + " <-------");
	console.log("\n");
	console.log("-------> DETECTED BROKEN LINKS: <-------");
    console.log(brokenLinks);
}
