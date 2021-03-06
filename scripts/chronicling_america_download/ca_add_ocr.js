/**
 * This script loops through the local "editions" collection in mongodb, the calls out to each edition URL in order to 
 * fetch the OCR text which then gets added to the edition document.
 * 
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');

var editions = [],
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
 * Fetch all editions for which pages.ocr does not yet exist, loop through the results and update 
 * them to include the OCR text.
 */
MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
    if (err) throw err;

    var collection = db
        .collection('editions')
        .find({"pages.ocr": {"$exists": false}}, {"pages":1})
        .toArray(function(err, docs) {
            editions = docs;
            numEditions = editions.length;
            console.log(numEditions + " total editions");
            db.close();

            // loop through all editions
            for (var i = 0; i < numEditions; i++) {
                var numPages = editions[i].pages.length;
                // loop through all pages in each edition, and construct the ocr URL based on its page URL.
                for (var j = 0; j < numPages; j++) {
                    var page_url = editions[i].pages[j].url;
                    var ocr_url = page_url.substr(0, page_url.length - 5) + "/ocr.txt";
                    var page = {
                        edition_id: editions[i]["_id"],
                        page_url: editions[i].pages[j].url,
                        ocr_url: ocr_url
                    }
                    pages.push(page);
                }
            }

            console.log(pages.length + " total pages");
            // console.log(pages[0]);

            // addOcr(pages[0]);
            updateDocuments(pages, "editions", wrapUp);

        });
});

/**
 * This is a little convoluted. Here we take an array of ALL the pages from ALL the editions, and for each one
 * go out and fetch its OCR text, then update its corresponding edition document in local Mongo.
 */
function updateDocuments(documents, collectionName, callback) {
    console.log("saveDocuments");
    var curDocument = 0,
        numDocuments = documents.length;

    updateDocument(documents[curDocument], collectionName);

    // Update the specific page. The edition id is stored on the page_obj.
    function updateDocument(page_obj, collectionName) {
        
        // Fetch the OCR text
        request({
            url: page_obj.ocr_url,
            json: true
        }, function(error, response, body) {

            if (!error && response.statusCode == 200) {

                // Successfully fetched, update the edition
                MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
                    if (err) throw err;
                    var collection = db.collection(collectionName);

                    collection.update({
                        "_id": page_obj.edition_id,
                        "pages.url": page_obj.page_url
                    }, {
                        '$set': {
                            "pages.$.ocr": body
                        }
                    }, {
                        'upsert': true
                    }, function(err, docs) {
                        if (err) {
                            console.log(err);
                        }

                        // Successfully updated edition record.

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
                brokenLinks.push(page_obj.ocr_url);

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
