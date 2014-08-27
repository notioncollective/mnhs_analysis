/**
 * Generate a collection that contains all sentences that contain the search terms aggregated by [_aggLev].
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,

    // by default, agggregate by month
    _aggLev = "month";


/**
 * _executeQuery gets passed an array of strings that will be used as search tokens and compared.
 *
 * @param  {[type]} regexArray [description]
 * @return {[type]}            [description]
 */
function _executeQuery(searchTerm) {

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
                    AGG_LEVEL: _aggLev,
                    SEARCH_TERM: searchTerm,
                    OCR_EMPTY_STR: 'no_text'
                },

                // sort the INPUT records
                // sort: {},

                // for testing mapreduce algorithm, it's useful to do shorter runs.
                // limit: 100,

                // finalize: finalize,

                // collection into which the result will be saved
                out: _generateCollectionName(searchTerm)
            },

            function(err, results) {
                if (err) console.log(err);
                console.log(results);
                db.close();
            }
        );
    });
}

/**
 * Determine if the results should be aggregated by week, month, or year.
 * @param {[type]} aggLev [description]
 */
function _setAggregationLevel(aggLev) {
    if (aggLev !== 'week' && aggLev !== 'month' && aggLev !== 'year') {
        console.log('The first argument must be an aggregation level: week, month, or year');
        process.exit(0);
    } else {
        _aggLev = aggLev;
    }
}

/**
 * Generate the collection name based on the array of config words.
 *
 * Ex:
 *
 * // for Aggregation Level 'month'
 * 
 * _generateCollectionName(['war', 'peace'])
 *
 * // returns war_peace_occurances_per_total_by_month
 *
 * 
 * @param  {[type]} searchTerm [description]
 * @return {[type]}        [description]
 */
function _generateCollectionName(searchTerm) {
    var collectionName = 'sentences_containing_' + searchTerm;
    collectionName += "_by_" + _aggLev;
    console.log('creating collection: ' + collectionName);
    return collectionName;
}

function map() {
    // console.log('map!');
    var pages = this.pages,
        numPages = pages.length,
        numSentences = 0,
        results = {},
        output = {
            numSentences: 0,
            sentences: []
        },
        hasOcrContent = false;


    for (var i = 0; i < numPages; i++) {
        // get ocr content of the current document
        var ocr = pages[i].ocr;

        // if ocr doesn't exist, go to next page
        if (!ocr || !ocr.match || ocr === OCR_EMPTY_STR) continue;

        // this one has some ocr content
        hasOcrContent = true;

        // find all sentences
        var sentenceRegex = new RegExp(/["']?([A-Z]((?!([A-Za-z]{2,}|\d+)[.?!]+["']?\s+["']?[A-Z]).)*)(((Mr|Ms|Mrs|Dr|Capt|Col)\.\s+((?!\w{2,}[.?!]['"]?\s+["']?[A-Z]).)*)?)*((?![.?!]["']?\s+["']?[A-Z]).)*[.?!]+["']?/gm);
        var sentences = ocr.match(sentenceRegex);

        var regex = new RegExp("\\s+" + SEARCH_TERM + "\\s+", "gi");

        // if there are no words, go to next page
        if (sentences == null) {
            continue;
        } else {
            for (var k in sentences) {
                if (sentences[k].match(regex) !== null) {
                    output.numSentences += 1;
                    // print(sentences[k]);
                    var sentence = {
                        sentence: sentences[k],
                        length: sentences[k].length
                    };
                    output.sentences.push(sentence);
                }
            }
        }
    }

    var date = new Date(this.date_issued),
        emitDate;

    switch (AGG_LEVEL) {
        case "week":
            var first = date.getDate() - date.getDay();
            emitDate = new Date(date.setDate(first));
            break;
        case "month":
            emitDate = new Date(date.getFullYear(), date.getMonth(), 1);
            break;
        case "year":
            emitDate = new Date(date.getFullYear(), 1, 1);
            break;
    }

    // print(output);

    // for each newspaper edition, emit the total word count
    if (hasOcrContent) {
        emit(emitDate.toISOString(), output);
    }
}

// Aggregate occurrances and total words
function reduce(key, values) {
    var result = {
        numSentences: 0,
        sentences: []
    };

    var len = values.length;

    for (var i = 0; i < len; i++) {
        result.numSentences += values[i].numSentences;
        result.sentences = result.sentences.concat(values[i].sentences);
    }

    return result;
}

// Add additional metrics based on reduces values
function finalize(key, reducedValue) {
    var summed_occurrances_per_total = 0;

    for (var i in CONFIG) {
        reducedValue.words[i].occurrances_per_total = reducedValue.words[i].total_occurrances / reducedValue.totalWords;
        summed_occurrances_per_total += reducedValue.words[i].occurrances_per_total;
    }

    // sum word occurrances per total words, then find percent that each word represents from that total
    for (var j in CONFIG) {
        reducedValue.words[j].occurrances_percent = summed_occurrances_per_total ? reducedValue.words[j].occurrances_per_total / summed_occurrances_per_total : 0;
    }

    return reducedValue;
}



exports.executeQuery = _executeQuery;
exports.setAggregationLevel = _setAggregationLevel;
