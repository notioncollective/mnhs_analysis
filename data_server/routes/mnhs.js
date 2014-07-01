var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

/* GET users listing. */
router.get('/occurances_bydate', function(req, res) {
    // res.send('respond with a resource');
    MongoClient.connect('mongodb://127.0.0.1:27017/mnhs', function(err, db) {
        if (err) throw err;

        var occurances_bydate = db.collection('influenza_occurances_bydate');

        occurances_bydate
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