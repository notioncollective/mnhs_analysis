var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');


// if (process.argv.length < 3) {
//     console.log("Please add URL");
//     process.exit(0);
// }

/****
****/
var START_DOC = 0;


var URL = process.argv[2] || 'http://chroniclingamerica.loc.gov/awardees/mnhi.json';
var batches, editions = [],
    pages = [];
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

    var collection = db
        .collection('editions')
        .find({"pages.ocr": {"$exists": false}}, {"pages":1})
        .toArray(function(err, docs) {
            editions = docs;
            numEditions = editions.length;
            console.log(numEditions + " total editions");
            db.close();
            for (var i = 0; i < numEditions; i++) {
                var numPages = editions[i].pages.length;
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

function updateDocuments(documents, collectionName, callback) {
    console.log("saveDocuments");
    var curDocument = START_DOC,
        numDocuments = documents.length;



    updateDocument(documents[curDocument], collectionName);

    function updateDocument(page_obj, collectionName) {
        // console.log("updating document: ", page_obj);
        request({
            url: page_obj.ocr_url,
            json: true
        }, function(error, response, body) {

            // console.log(body);
            // return;

            if (!error && response.statusCode == 200) {

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

function wrapUp() {
    console.log("-------> COMPLETE <-------");
    console.log("\n");
    console.log("-------> Errors: " + numErrors + " <-------");
    console.log("\n");
    console.log("-------> DETECTED BROKEN LINKS: <-------");
    console.log(brokenLinks);
}
