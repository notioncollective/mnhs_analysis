/**
 * This script fetches all of the MN "batches" of newspapers available Chronicling America
 * and stores them in a local mongo db collection.
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,
    request = require('request');


var URL = process.argv[2] || 'http://chroniclingamerica.loc.gov/awardees/mnhi.json';
var batches, editions, pages;
var curBatch = 0, numBatches;
var curEdition = 0, numEditions;
var curPage = 0, numPages;

saveBatches(URL);

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