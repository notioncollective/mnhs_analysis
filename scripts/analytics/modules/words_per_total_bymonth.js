/**
 * Generate a collection that contains the number of [searchTerm] per total number of words per month.
 */
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;


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
                    CONFIG: config,
                    OCR_EMPTY_STR: 'no_text'
                },

                // sort the INPUT records
                // sort: {},

                finalize: finalize,

                // collection into which the result will be saved
                out: generateCollectionName(config)
            },

            function(err, results) {
                if (err) console.log(err);
                console.log(results);
                db.close();
            }
        );
    });
}

function generateCollectionName(config) {
    var collectionName = '';
    for (var word in config) {
        collectionName += word + "_";
    };
    collectionName += "occurrances_per_total_bymonth";
    return collectionName;
}

function map() {
    // console.log('map!');
    var pages = this.pages,
        numPages = pages.length,
        totalWords = 0,
        results = [],
        output = {
            totalWords: 0
        },
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

        // loop through config and process each entry
        for (var word in CONFIG) {
            // print(word);
            // process results from regex matches
            var regex = new RegExp("\s+"+word+"\s+", "gi");
            var result = {};
            result[word] = ocr.match(regex);
            results.push(result);

            // setup output object
            output["total_"+word+"_occurrances"];
        };

        // if there are no words, go to next page
        if (words == null) {
            continue;
        } else {
            output.totalWords += words.length;

            for (var word in results) {
                if (results[word] !== null) {
                    output["total_"+word+"_occurrances"] += results[word].length;
                }
            };
        }
    }

    var date = new Date(this.date_issued);
    var month = new Date(date.getFullYear(), date.getMonth(), 1);

    // for each newspaper edition, emit the total word count
    if (hasOcrContent) {
        emit(month.toISOString(), output);
    }
}

// Aggregate occurrances and total words
function reduce(key, values) {
    var result = {
        totalWords: 0
    };

    var len = values.length;

    for (var i = 0; i < len; i++) {
        result.totalWords += values[i].totalWords;

        // loop through config and process each entry
        for (var word in CONFIG) {
            // sum values for this year
            result["total_"+word+"_occurrances"] += values[i]["total_"+word+"_occurrances"];
        };
    }

    return result;
}

// Add additional metrics based on reduces values
function finalize(key, reducedValue) {
    var summed_occurrances_per_total = 0;

    for (var word in CONFIG) {
        reducedValue[word+"_occurrances_per_total_words"] = reducedValue["total_"+word+"_occurrances"] / reducedValue.totalWords;
        summed_occurrances_per_total += reducedValue[word+"_occurrances_per_total_words"];
    };

    // sum word occurrances per total words, then find percent that each word represents from that total
    for (var word in CONFIG) {
        reducedValue[word+"_occurance_percent"] = reducedValue["total_"+word+"_occurrances"] / summed_occurrances_per_total;
    };

    // reducedValue.warToPeaceRatio = reducedValue.warOccurancesPerWords / reducedValue.peaceOccurancesPerWords;
    // reducedValue.warOccurancesPerWords = reducedValue.totalWarOccurances / reducedValue.totalWords;
    // reducedValue.peaceOccurancesPerWords = reducedValue.totalPeaceOccurances / reducedValue.totalWords;
    return reducedValue;
}



exports.executeQuery = _executeQuery;
