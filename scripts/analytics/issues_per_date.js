var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
    if (err) throw err;

    var editions = db.collection('editions');

    editions.mapReduce(map, reduce, {
    		query: {},
            // collection into which the result will be saved
            out: "issues_per_date"
        },

        function(err, results) {
        	if (err) console.log(err);
            console.log(results);
            db.close();
        }
    );
});


function map() {
    // emit the date_issued as key, will sum in 
    emit(this.date_issued, 1);
}

function reduce(date, issues) {
    return Array.sum(issues);
}
