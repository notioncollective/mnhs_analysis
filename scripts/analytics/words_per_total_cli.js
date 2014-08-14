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
 * The new collection will be called 'war_peace_occurrances_per_total_bymonth' and will contain objects in the following format:
 *
 * {
 *     "_id" : "1856-01-01T05:00:00.000Z",
 *     "value" : {
 *         "totalWords" : 27163,
 *         "total_war_occurrances" : 2,
 *         "total_peace_occurrances" : 10,
 *         "war_occurrances_per_total_words" : 0.00007362956963516548,
 *         "peace_occurrances_per_total_words" : 0.0003681478481758274,
 *         "war_occurrance_percent" : 0.16666666666666666,
 *         "peace_occurrance_percent" : 0.8333333333333333
 *     }
 * }
 * 
 */

var WordSmith = require('./modules/words_per_total_module');

var config = [],
    aggLev;

if (process.argv.length < 4) {
    console.log("\nERROR: Please supply a list of search terms separated by a space as arguments.\n");
    console.log("USAGE:");
    console.log("$ node words_per_total_cli.js week searchterm1 searchterm2 searchterm3\n");
    process.exit(0);
} else {
    aggLev = process.argv[2];
    if (aggLev !== 'week' && aggLev !== 'month' && aggLev !== 'year') {
        console.log('The first argument must be an aggregation level: week, month, or year');
        process.exit(0);
    }
    for (var i = 3; i < process.argv.length; i++) {
        config.push(process.argv[i]);
    };
}

if (config.length === 0) {
    console.log("\nERROR: Config empty.\n");
    process.exit(0);
}

WordSmith.setAggregationLevel(aggLev);
WordSmith.executeQuery(config);
