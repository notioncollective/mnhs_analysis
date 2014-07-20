/**
 * This script loops through the local "publications" collection in mongodb, the calls out to each edition URL in order to 
 * fetch the OCR text which then gets added to the edition document.
 * 
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');

var publications = [],
    pages = [];
var curBatch = 0,
    numBatches;
var curEdition = 0,
    numEditions = 0;
var curPage = 0,
    numPages;

var numErrors = 0;
var brokenLinks = [];


/**
 * Fetch all publications for which pages.ocr does not yet exist, loop through the results and update 
 * them to include the OCR text.
 */
MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
    if (err) throw err;

    var collection = db
        .collection('publications')
        .find({})
        .toArray(function(err, docs) {
            publications = docs;
            numPubs = publications.length;
            console.log(numPubs + " total publications");
            db.close();

            updateDocuments(publications, "publications", wrapUp);

        });
});

/**
 * This is a little convoluted. Here we take an array of ALL the pages from ALL the publications, and for each one
 * go out and fetch its OCR text, then update its corresponding edition document in local Mongo.
 */
function updateDocuments(documents, collectionName, callback) {
    var curDocument = 0,
        numDocuments = documents.length;

    updateDocument(documents[curDocument], collectionName);

    // Update the specific page. The edition id is stored on the publication.
    function updateDocument(publication, collectionName) {
        
        // Fetch the OCR text
        request({
            url: publication["_id"],
            json: true
        }, function(error, response, body) {

            if (!error && response.statusCode == 200) {

                // Successfully fetched, update the edition
                MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
                    if (err) throw err;
                    var collection = db.collection(collectionName);

                    collection.update({
                        "_id": publication["_id"]
                    }, body, {}, function(err, docs) {
                        if (err) {
                            console.log(err);
                        }

                        // Successfully updated publication record.

                        db.close();

                        curDocument += 1;

                        var remaining = numDocuments - curDocument;
                        var percent = Math.round(100*(curDocument / numDocuments));
                        console.log(percent + "% -- Document " + curDocument + " of " + numDocuments + " inserted. " + remaining + " remaining.");


                        if (curDocument < numDocuments) {
                            updateDocument(documents[curDocument], collectionName);
                        } else {
                            if (callback) callback();
                        }
                    });
                });
            } else {
                // console.log(body);
                console.log("-------> PROBLEM <-------");
                numErrors += 1;
                brokenLinks.push(publication.ocr_url);

                curDocument += 1;

                var remaining = numDocuments - curDocument;
                console.log("Document " + curDocument + " of " + numDocuments + " inserted. " + remaining + " remaining.");

                if (curDocument < numDocuments) {
                    updateDocument(documents[curDocument], collectionName);
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
