/**
 * Generate a collection that contains word counts (occurances) for each edition containing the 
 * specified word.
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

if (process.argv.length < 3) {
    console.log("\nERROR: Please supply a search term as argument.\n");
    console.log("USAGE:");
    console.log("$ node wordcount_byissue.js searchterm\n");
    process.exit(0);
}

var searchWord = process.argv[2],
	regex = new RegExp(searchWord, "i");

MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
    if (err) throw err;

    var editions = db.collection('editions');

    editions.mapReduce(map, reduce, {
            // if we want to ONLY return docs that contain the search term:
    		// query: { '$text': { '$search': searchWord }},
         
            // if we want to return all
            query: {},

    		// The scope provides variables to the map/reduce functions
    		scope: {regex: regex, OCR_EMPTY_STR: 'no_text'},
            
            // sort the INPUT records
            // sort: {},
            
            // collection into which the result will be saved
            out: searchWord + "_occurances_byissue"
        },

        function(err, results) {
        	if (err) console.log(err);
            console.log(results);
            db.close();
        }
    );
});


function map() {
	// console.log('map!');
    var pages = this.pages,
        numPages = pages.length,
        totalOccurances = 0,
        hasOcrContent = false;

    for (var i = 0; i < numPages; i++) {
        // get ocr content of the current document
        var ocr = pages[i].ocr;

        // if ocr doesn't exist, go to next page
        if (!ocr || !ocr.match || ocr === OCR_EMPTY_STR) continue;

        // this one has some ocr content
        hasOcrContent = true;

        // find all matchs of searchWord in ocr
        var matches = ocr.match(this['regex']);

        // if there are no matches, go to next page
        if (matches == null) {
            continue;
        } else {
            totalOccurances += matches.length;
        }
    };

    // if there are no occurances, do not emit anything.
    // UPDATE: I think it makes more sense to return a zero here rather than omit the record
    // if (totalOccurances == 0) return;

    // for each newspaper edition, emit the total occurances of the word:
    if(hasOcrContent) {
        emit(this._id, { occurances: totalOccurances, group: 1});
    }
}

function reduce(key, values) {
	// console.log('reduce!');
    return values[0];
}
