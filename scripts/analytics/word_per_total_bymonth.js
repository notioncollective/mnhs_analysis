/**
 * Generate a collection that contains the number of [searchTerm] per total number of words per month.
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
            scope: {
                REGEX: regex,
                OCR_EMPTY_STR: 'no_text'
            },

            // sort the INPUT records
            // sort: {},
            
            finalize: finalize,

            // collection into which the result will be saved
            out: searchWord + "_per_total_words_bymonth"
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
        totalOccurances = 0,
        hasOcrContent = false;

    for (var i = 0; i < numPages; i++) {
        // get ocr content of the current document
        var ocr = pages[i].ocr;

        // if ocr doesn't exist, go to next page
        if (!ocr || !ocr.match || ocr === OCR_EMPTY_STR) continue;

        // this one has some ocr content
        hasOcrContent = true;

        // find all matchs of non-whitespace sequences
        var words = ocr.match(/\S+/g);

        var searchTerms = ocr.match(/\s+war\s+/gi);

        // if there are no words, go to next page
        if (words == null) {
            continue;
        } else {
            // print('words: ' + words.length);
            totalWords += words.length;
            if (searchTerms !== null) {
                print('searchMatches: ' + searchTerms.length);
                totalOccurances += searchTerms.length;
            }
        }
    }

    var date = new Date(this.date_issued);
    var month = new Date(date.getFullYear(), date.getMonth(), 1);

    // for each newspaper edition, emit the total word count
    if (hasOcrContent) {
        emit(month.toISOString(), {
            totalWords: totalWords,
            totalOccurances: totalOccurances
        });
    }
}

function reduce(key, values) {
    var result = {
            totalWords: 0,
            totalOccurances: 0
        };

    var len = values.length;

    for (var i = 0; i < len; i++) {
        result.totalOccurances += values[i].totalOccurances;
        result.totalWords += values[i].totalWords;
    }

    return result;
}

function finalize(key, reducedValue) {
    reducedValue.occurancesPerWords = reducedValue.totalOccurances / reducedValue.totalWords;
    return reducedValue;
}
