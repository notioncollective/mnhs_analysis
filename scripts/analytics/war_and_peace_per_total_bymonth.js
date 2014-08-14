/**
 * Generate a collection that contains the number of [searchTerm] per total number of words per month.
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

// if (process.argv.length < 3) {
//     console.log("\nERROR: Please supply a search term as argument.\n");
//     console.log("USAGE:");
//     console.log("$ node wordcount_byissue.js searchterm\n");
//     process.exit(0);
// }

// var searchWord = process.argv[2],
//     regex = new RegExp(searchWord, "i");

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
                // REGEX: regex,
                OCR_EMPTY_STR: 'no_text'
            },

            // sort the INPUT records
            // sort: {},
            
            finalize: finalize,

            // collection into which the result will be saved
            out: "war_and_peace_per_total_words_bymonth"
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
        totalWarOccurances = 0,
        totalPeaceOccurances = 0,
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

        var war = ocr.match(/\s+war\s+/gi);
        var peace = ocr.match(/\s+peace\s+/gi);

        // if there are no words, go to next page
        if (words == null) {
            continue;
        } else {
            // print('words: ' + words.length);
            totalWords += words.length;
            if (war !== null) {
                print('searchMatches: ' + war.length);
                totalWarOccurances += war.length;
            }
            if (peace !== null) {
                print('searchMatches: ' + peace.length);
                totalPeaceOccurances += peace.length;
            }
        }
    }

    var date = new Date(this.date_issued);
    var month = new Date(date.getFullYear(), date.getMonth(), 1);

    // for each newspaper edition, emit the total word count
    if (hasOcrContent) {
        emit(month.toISOString(), {
            totalWords: totalWords,
            totalWarOccurances: totalWarOccurances,
            totalPeaceOccurances: totalPeaceOccurances
        });
    }
}

// Aggregate war and peace occurances and total words
function reduce(key, values) {
    var result = {
            totalWords: 0,
            totalWarOccurances: 0,
            totalPeaceOccurances: 0
        };

    var len = values.length;

    for (var i = 0; i < len; i++) {
        result.totalWarOccurances += values[i].totalWarOccurances;
        result.totalPeaceOccurances += values[i].totalPeaceOccurances;
        result.totalWords += values[i].totalWords;
    }

    return result;
}

// Add additional metrics based on reduces values
function finalize(key, reducedValue) {
    reducedValue.warOccurancesPerWords = reducedValue.totalWarOccurances / reducedValue.totalWords;
    reducedValue.peaceOccurancesPerWords = reducedValue.totalPeaceOccurances / reducedValue.totalWords;
    reducedValue.warToPeaceRatio = reducedValue.warOccurancesPerWords / reducedValue.peaceOccurancesPerWords;
    return reducedValue;
}
