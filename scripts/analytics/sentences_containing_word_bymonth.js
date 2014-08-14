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
    searchWordPadded = " "+searchWord+" ",
    regex = new RegExp("\s+"+searchWord+"\s+", "i");

MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
    if (err) throw err;

    var editions = db.collection('editions');

    console.log('connected, attempting mapReduce');

    editions.mapReduce(map, reduce, {
            // if we want to ONLY return docs that contain the search term:
            // query: { '$text': { '$search': searchWord }},

            // if we want to return all
            query: {},

            // The scope provides variables to the map/reduce functions
            scope: {
                regex: regex,
                OCR_EMPTY_STR: 'no_text',
                SEARCH_WORD: searchWordPadded
            },

            // sort the INPUT records
            // sort: {},

            // collection into which the result will be saved
            out: searchWord + "_sentences_bymonth"
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
        totalSentencesWithWord = 0,
        totalOccurances = 0,
        sentencesWithWord = [],
        hasOcrContent = false;

    for (var i = 0; i < numPages; i++) {
        // get ocr content of the current document
        var ocr = pages[i].ocr;

        // if ocr doesn't exist, go to next page
        if (!ocr || !ocr.match || ocr === OCR_EMPTY_STR) continue;

        // this one has some ocr content
        hasOcrContent = true;

        // find all matchs of of non-whitespace sequences
        var sentenceRegex = new RegExp(/["']?([A-Z]((?!([A-Za-z]{2,}|\d+)[.?!]+["']?\s+["']?[A-Z]).)*)(((Mr|Ms|Mrs|Dr|Capt|Col)\.\s+((?!\w{2,}[.?!]['"]?\s+["']?[A-Z]).)*)?)*((?![.?!]["']?\s+["']?[A-Z]).)*[.?!]+["']?/gm);


        var sentences = ocr.match(sentenceRegex);

        // if we have matched sentences, loop through the array and look for sentences containing the searchTerm
        if (sentences == null) {
            continue;
        } else {
            print("sentences: " + sentences.length);
            for(var i in sentences) {
                if (sentences[i].indexOf(SEARCH_WORD) !== -1) {
                    // match
                    sentencesWithWord.push(sentences[i]);
                    totalSentencesWithWord += 1;
                }
            }
        }
    }

    var date = new Date(this.date_issued);
    var month = new Date(date.getFullYear(), date.getMonth(), 1);

    // for each newspaper edition, emit the total word count
    if (hasOcrContent) {
        // print('emiting ' + month.toISOString() + ' | totalSentencesWithWord: ' + totalSentencesWithWord);
        emit(month.toISOString(), {
            totalSentencesWithWord: totalSentencesWithWord,
            sentencesWithWord: sentencesWithWord
        });
    }
}

function reduce(key, values) {
    var result = {
            totalSentencesWithWord: 0,
            sentencesWithWord: 0
        };

    var len = values.length;

    for (var i = 0; i < len; i++) {
        result.totalSentencesWithWord += values[i].totalSentencesWithWord;
        result.sentencesWithWord.concat(values[i].sentencesWithWord);
    }

    return result;
}
