/**
 * Generate a collection that contains the number of [searchTerm] per total number of words per month.
 * 
 * TODO: refactor the output so that the results can be easily iterated over. Something like this:
 *
 * {
 *     "_id" : "1856-01-01T05:00:00.000Z",
 *     "value" : {
 *         "totalWords" : 27163,
 *         "words": [{
 *             word: "war",
 *             total_occurrances: 2,
 *             occurrances_per_total: 0.00007362956963516548,
 *             occurrances_percent: 0.16666666666666666
 *         },{
 *             word: "peace",
 *             total_occurrances: 10,
 *             occurrances_per_total: 0.0003681478481758274,
 *             occurrances_percent: 0.8333333333333333
 *         }]
 *     }
 * }
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format,

    // by default, agggregate by month
    _aggLev = "month";


/**
 * _executeQuery gets passed an object of regexp objects that will be used as search tokens.
 *
 * Ex. Config
 * {
 *     "war": /\s+war\s+/gi,
 *     "peace": /\s+peace\s+/gi
 * }
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

function _setAggregationLevel(aggLev) {
    if (aggLev !== 'week' && aggLev !== 'month' && aggLev !== 'year') {
        console.log('The first argument must be an aggregation level: week, month, or year');
        process.exit(0);
    } else {
        _aggLev = aggLev;
    }
}

function _generateCollectionName(config) {
    var collectionName = '';
    for (var word in config) {
        collectionName += config[word] + "_";
    };
    collectionName += "occurrances_per_total_by_" + _aggLev;
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
            total_occurrances: 0,
            occurrances_per_total: 0,
            occurrances_percent: 0
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
            // print("results[CONFIG[j]]: " + results[CONFIG[j]]);
            // results.push(result);

            // setup output object
            // output["total_" + CONFIG[j] + "_occurrances"] = 0;
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
                    output.words[k].total_occurrances += results[CONFIG[k]].length;
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
        totalWords: 0,
        words: []
    };

    // setup result
    for (var a in CONFIG) {
        result.words[a] = {
            word: CONFIG[a],
            total_occurrances: 0
        };
    }

    var len = values.length;

    for (var i = 0; i < len; i++) {
        result.totalWords += values[i].totalWords;

        // loop through config and process each entry
        for (var j in CONFIG) {
            // print(CONFIG[j] + ": " + values[i]["total_" + CONFIG[j] + "_occurrances"]);
            // sum values for this year
            result.words[j].total_occurrances += values[i].words[j].total_occurrances;
            // result["total_" + CONFIG[j] + "_occurrances"] += values[i]["total_" + CONFIG[j] + "_occurrances"];
        };
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

    // reducedValue.warToPeaceRatio = reducedValue.warOccurancesPerWords / reducedValue.peaceOccurancesPerWords;
    // reducedValue.warOccurancesPerWords = reducedValue.totalWarOccurances / reducedValue.totalWords;
    // reducedValue.peaceOccurancesPerWords = reducedValue.totalPeaceOccurances / reducedValue.totalWords;
    return reducedValue;
}



exports.executeQuery = _executeQuery;
exports.setAggregationLevel = _setAggregationLevel;
