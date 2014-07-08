/**
 * Generate a collection that contains the total number of ocr words for each edition.
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
    if (err) throw err;

    var editions = db.collection('editions');

    editions.mapReduce(map, reduce, {
            // if we want to ONLY return docs that contain the search term:
    		// query: { '$text': { '$search': searchWord }},
         
            // if we want to return all
            query: {},

    		// The scope provides variables to the map/reduce functions
    		scope: {OCR_EMPTY_STR: 'no_text'},
            
            // sort the INPUT records
            // sort: {},
            
            // collection into which the result will be saved
            out: "total_words_byissue"
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
        totalWords = 0,
        hasOcrContent = false;

    for (var i = 0; i < numPages; i++) {
        // get ocr content of the current document
        var ocr = pages[i].ocr;

        // if ocr doesn't exist, go to next page
        if (!ocr || !ocr.match || ocr === OCR_EMPTY_STR) continue;

        // this one has some ocr content
        hasOcrContent = true;

        // find all matchs of of non-whitespace sequences
        var matches = ocr.match(/\S+/g);

        // if there are no matches, go to next page
        if (matches == null) {
            continue;
        } else {
            totalWords += matches.length;
        }
    };

    // if there are no occurances, do not emit anything.
    // UPDATE: I think it makes more sense to return a zero here rather than omit the record
    // if (totalWords == 0) return;

    // for each newspaper edition, emit the total occurances of the word:
    if(hasOcrContent) {
        emit(this._id, { number_of_words: totalWords });
    }
}

function reduce(key, values) {
	// console.log('reduce!');
    return values[0];
}
