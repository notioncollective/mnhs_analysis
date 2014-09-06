/**
 * Generate a collection that contains the number of [searchTerm] per total number of words per month.
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
function _executeQuery(config) {

    if (!config || typeof config !== 'object') {
        console.log("execute requires a config object");
        return;
    }

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
                    CONFIG: config,
                    OCR_EMPTY_STR: 'no_text'
                },

                // sort the INPUT records
                // sort: {},

                // for testing mapreduce algorithm, it's useful to do shorter runs.
                // limit: 100,

                finalize: finalize,

                // collection into which the result will be saved
                out: _generateCollectionName(config)
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
    if (aggLev !== 'issue' && aggLev !== 'day' && aggLev !== 'week' && aggLev !== 'month' && aggLev !== 'year') {
        console.log('The first argument must be an aggregation level: issue, day, week, month, or year');
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
 * // returns war_peace_occurrences_per_total_by_month
 *
 * 
 * @param  {[type]} config [description]
 * @return {[type]}        [description]
 */
function _generateCollectionName(config) {
    var collectionName = '';
    for (var word in config) {
        collectionName += config[word] + "_";
    };
    collectionName += "occurrences_per_total_by_" + _aggLev;
    console.log('creating collection: ' + collectionName);
    return collectionName;
}

function map() {
    // console.log('map!');
    var pages = this.pages,
        numPages = pages.length,
        totalWords = 0,
        results = {},
        output = {
            totalWords: 0,
            words: []
        },
        hasOcrContent = false;

    // setup output
    for (var l = 0; l < CONFIG.length; l++) {
        output.words.push({
            word: CONFIG[l],
            total_occurrences: 0,
            occurrences_per_total: 0,
            occurrences_percent: 0
        });
    }

    for (var i = 0; i < numPages; i++) {
        // get ocr content of the current document
        var ocr = pages[i].ocr;

        // if ocr doesn't exist, go to next page
        if (!ocr || !ocr.match || ocr === OCR_EMPTY_STR) continue;

        // this one has some ocr content
        hasOcrContent = true;

        // find all matchs of non-whitespace sequences
        var words = ocr.match(/\S+/g);

        // loop through config and process each entry
        for (var j = 0; j < CONFIG.length; j++) {

            // process results from regex matches
            // print("CONFIG[j]: " + CONFIG[j]);
            var regex = new RegExp("\\s+" + CONFIG[j] + "\\s+", "gi");
            results[CONFIG[j]] = ocr.match(regex);
        }

        // print("page: " + i);

        // if there are no words, go to next page
        if (words == null) {
            continue;
        } else {
            output.totalWords += words.length;

            for (var k in CONFIG) {
                if (results[CONFIG[k]] !== null) {
                    // print("results[CONFIG[k]].length: " + results[CONFIG[k]].length);
                    output.words[k].total_occurrences += results[CONFIG[k]].length;
                }
            }
        }
    }

    var date = new Date(this.date_issued),
        emitDate,
        emitKey;

    switch (AGG_LEVEL) {
        case "issue":
            emitKey = this['_id'];
            break;
        case "day":
            emitKey = date.toISOString();
            break;
        case "week":
            var first = date.getDate() - date.getDay();
            emitDate = new Date(date.setDate(first));
            emitKey = emitDate.toISOString();
            break;
        case "month":
            emitDate = new Date(date.getFullYear(), date.getMonth(), 1);
            emitKey = emitDate.toISOString();
            break;
        case "year":
            emitDate = new Date(date.getFullYear(), 1, 1);
            emitKey = emitDate.toISOString();
            break;
    }

    // print(output);

    // for each newspaper edition, emit the total word count
    if (hasOcrContent) {
        emit(emitKey, output);
    }
}

// Aggregate occurrences and total words
function reduce(key, values) {
    var result = {
        totalWords: 0,
        words: []
    };

    // setup result
    for (var a in CONFIG) {
        result.words[a] = {
            word: CONFIG[a],
            total_occurrences: 0
        };
    }

    var len = values.length;

    for (var i = 0; i < len; i++) {
        result.totalWords += values[i].totalWords;

        // loop through config and process each entry
        for (var j in CONFIG) {
            // sum values for this year
            result.words[j].total_occurrences += values[i].words[j].total_occurrences;
        };
    }

    return result;
}

// Add additional metrics based on reduces values
function finalize(key, reducedValue) {
    var summed_occurrences_per_total = 0;

    for (var i in CONFIG) {
        reducedValue.words[i].occurrences_per_total = reducedValue.words[i].total_occurrences / reducedValue.totalWords;
        summed_occurrences_per_total += reducedValue.words[i].occurrences_per_total;
    }

    // sum word occurrences per total words, then find percent that each word represents from that total
    for (var j in CONFIG) {
        reducedValue.words[j].occurrences_percent = summed_occurrences_per_total ? reducedValue.words[j].occurrences_per_total / summed_occurrences_per_total : 0;
    }

    return reducedValue;
}



exports.executeQuery = _executeQuery;
exports.setAggregationLevel = _setAggregationLevel;
