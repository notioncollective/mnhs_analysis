var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

/* GET users listing. */
router.get('/occurrences_bydate', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var occurrences_bydate = db.collection('influenza_occurrences_bydate');

        occurrences_bydate
            .find({})
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/influenza_occurrences_per_issue_per_week', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var occurrences_bydate = db.collection('typhoid_occurrences_per_issue_per_week');

        occurrences_bydate
            .find({})
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/war_occurrences_per_month', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var occurrences_bydate = db.collection('war_per_total_words_bymonth');

        occurrences_bydate
            // throwing out outliers...
            .find({"value.occurrencesPerWords": { $ne: 0 }})
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/peace_occurrences_per_month', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var occurrences_bydate = db.collection('peace_per_total_words_bymonth');

        occurrences_bydate
            // throwing out outliers...
            .find({"value.occurrencesPerWords": { $ne: 0 }})
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/war_and_peace_by_year', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var war_occurrences_bydate = db.collection('war_and_peace_per_total_words_byyear');

        war_occurrences_bydate
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/war_peace_by_month', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var war_occurrences_bydate = db.collection('war_peace_occurrences_per_total_by_month');

        war_occurrences_bydate
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/pleasure_pain_by_year', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var pleasure_pain_occurrences_per_total_by_month = db.collection('pleasure_pain_occurrences_per_total_by_year');

        pleasure_pain_occurrences_per_total_by_month
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/drugs_by_month', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var alcohol_cocaine_marijuana_heroin_opium_occurrences_per_total_by_month = db.collection('alcohol_cocaine_marijuana_heroin_opium_occurrences_per_total_by_month');

        alcohol_cocaine_marijuana_heroin_opium_occurrences_per_total_by_month
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/booze_by_month', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var beer_wine_whiskey_occurrences_per_total_bymonth = db.collection('beer_wine_whiskey_rum_moonshine_occurrences_per_total_by_month');

        beer_wine_whiskey_occurrences_per_total_bymonth
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/booze_by_year', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var beer_wine_whiskey_occurrences_per_total_bymonth = db.collection('beer_wine_whiskey_rum_moonshine_occurrences_per_total_by_year');

        beer_wine_whiskey_occurrences_per_total_bymonth
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/whiskey_whisky_by_year', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var beer_wine_whiskey_occurrences_per_total_bymonth = db.collection('whiskey_whisky_occurrences_per_total_by_year');

        beer_wine_whiskey_occurrences_per_total_bymonth
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/words_by_month', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var pleasure_pain_occurrences_per_total_by_month = db.collection('pleasure_pain_occurrences_per_total_by_month');

        pleasure_pain_occurrences_per_total_by_month
            // throwing out outliers...
            .find()
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

router.get('/issues_per_week', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var issues_per_week = db.collection('issues_per_week');

        issues_per_week
            .find({})
            .sort({
                _id: 1
            })
            .toArray(function(err, docs) {
                if (err) console.log(err);
                res.send(docs);
                db.close();

            });
    });
});

module.exports = router;
