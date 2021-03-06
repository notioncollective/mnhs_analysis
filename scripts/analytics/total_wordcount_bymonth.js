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
            out: "total_words_bymonth"
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

    var date = new Date(this.date_issued);
    var month = new Date(date.setDate(1));

    // for each newspaper edition, emit the total word count
    if(hasOcrContent) {
        emit(month.toISOString(), totalWords );
    }
}

function reduce(key, values) {
    return Array.sum(values);
}
