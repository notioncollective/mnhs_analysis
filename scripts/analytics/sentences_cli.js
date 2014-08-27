/**
 * Command-line access to generate new words per total collections with percentages.
 *
 * USAGE:
 *
 * $ node words_per_total_cli.js week|month|year searchTerm1 [searchTerm2] ... [searchTermN]
 *
 * EXAMPLE:
 *
 * $ node words_per_total_cli.js month war peace
 *
 * The example here will find the occurances of the words 'war' and 'peace' per total words, aggregated by month.
 * 
 * The new collection will be called 'war_peace_occurrances_per_total_by_month' and will contain objects in the following format:
 *
 * {
 *    "_id" : "1856-01-01T05:00:00.000Z",
 *    "value" : {
 *        "totalWords" : 27163,
 *        "words" : [
 *            {
 *                "word" : "war",
 *                "total_occurrances" : 2,
 *                "occurrances_per_total" : 0.00007362956963516548,
 *                "occurrances_percent" : 0.39999999999999997
 *            },
 *            {
 *                "word" : "peace",
 *                "total_occurrances" : 3,
 *                "occurrances_per_total" : 0.00011044435445274823,
 *                "occurrances_percent" : 0.6
 *            }
 *        ]
 *    }
 * }
 * 
 */

var WordSmith = require('./modules/sentences_with_word_module');

var searchTerm,
    aggLev;

if (process.argv.length < 4) {
    console.log("\nERROR: Please supply an aggregation level (week, month, or year) and a search term as arguments.\n");
    console.log("USAGE:");
    console.log("$ node sentences_cli.js week searchterm1\n");
    process.exit(0);
} else {
    aggLev = process.argv[2];
    if (aggLev !== 'week' && aggLev !== 'month' && aggLev !== 'year') {
        console.log('The first argument must be an aggregation level: week, month, or year');
        process.exit(0);
    }
    searchTerm = process.argv[3];
}

WordSmith.setAggregationLevel(aggLev);
WordSmith.executeQuery(searchTerm);
