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
                regex: regex,
                OCR_EMPTY_STR: 'no_text'
            },

            // sort the INPUT records
            // sort: {},

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

        // find all matchs of of non-whitespace sequences
        var words = ocr.match(/\S+/g);

        var searchTerms = ocr.match(this.regex);

        // if there are no words, go to next page
        if (words == null) {
            continue;
        } else {
            totalWords += words.length;
            if (searchTerms !== null) {
                totalOccurances += searchTerms.length;
            }
        }
    }

    var date = new Date(this.date_issued);
    var month = new Date(date.setDate(1));

    // for each newspaper edition, emit the total word count
    if (hasOcrContent) {
        emit(month.toISOString(), {
            totalWords: totalWords,
            totalOccurances: totalOccurances
        });
    }
}

function reduce(key, values) {
    var monthlyOccurances = 0,
        monthlyWords = 0,
        opwpm = 0;


    for (var i = 0; i < values.length; i++) {
        monthlyOccurances += values[i].totalOccurances;
        monthlyWords += values[i].totalWords;
    }

    opwpm = monthlyOccurances / monthlyWords;
    return opwpm;
}

/**
    db.snow_per_total_words_bymonth.aggregate({ $project : {
        "_id" : 1 ,
        stats : {
            monthlyWordsPerTotal : { $divide: ["$value.totalOccurances","$value.totalWords"] }
        }
    }})
 */
