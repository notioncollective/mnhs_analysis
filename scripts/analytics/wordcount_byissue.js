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
    		query: { '$text': { '$search': searchWord }},

    		// The scope provides variables to the map/reduce functions
    		scope: {regex: regex},
            
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
        totalOccurances = 0;

    for (var i = 0; i < numPages; i++) {
        // get ocr content of the current document
        var ocr = pages[i].ocr;

        // if ocr doesn't exist, go to next page
        if (!ocr || !ocr.match) continue;

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
    if (totalOccurances == 0) return;

    // for each newspaper edition, emit the total occurances of the word:
    emit(this._id, {
        occurances: totalOccurances
    });
}

function reduce(key, values) {
	// console.log('reduce!');
    return values[0];
}
