# MNHS Newspaper Data Analysis & Visualization

## Summary
This repository holds code used to fetch and analyze the MNHS newspaper archives found on chroniclingamerica.loc.gov. **Note: Data is not included in this repository, but can be fetched using the scripts provided.**

## Loading data
The data is downloaed and stored in a local MongoDB using the scripts in ```scripts/chronicling_america_download```. These are rather messy, and must be run in a sequence; given time, they should be refactored into a single script with a flexible API that performs the entire download (and perhaps can download any of the batches available on Chronicling America). There is much room for optimization via the use of multiple threads and bulk writes to mongo.

## Data Structure in MongoDB
Once the download of the data is complete, the structure in MongoDB is as shown below. For pages where OCR text does exist, it is included in the ```ocr``` property. The example below does not have OCR available, thus shows "no_text" in this field.

``` json
{
	"_id" : ObjectId("53ade5a9162e2a3334e11c5b"),
	"title" : {
		"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522.json",
		"name" : "St. Paul daily globe."
	},
	"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1.json",
	"date_issued" : "1885-02-16",
	"number" : "47",
	"batch" : {
		"url" : "http://chroniclingamerica.loc.gov/batches/batch_mnhi_chaska_ver01.json",
		"name" : "batch_mnhi_chaska_ver01"
	},
	"volume" : "7",
	"edition" : 1,
	"pages" : [
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-1.json",
			"sequence" : 1,
			"ocr" : "no_text"
		},
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-2.json",
			"sequence" : 2,
			"ocr" : "no_text"
		},
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-3.json",
			"sequence" : 3,
			"ocr" : "no_text"
		},
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-4.json",
			"sequence" : 4,
			"ocr" : "no_text"
		},
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-5.json",
			"sequence" : 5,
			"ocr" : "no_text"
		},
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-6.json",
			"sequence" : 6,
			"ocr" : "no_text"
		},
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-7.json",
			"sequence" : 7,
			"ocr" : "no_text"
		},
		{
			"url" : "http://chroniclingamerica.loc.gov/lccn/sn90059522/1885-02-16/ed-1/seq-8.json",
			"sequence" : 8,
			"ocr" : "no_text"
		}
	]
}
```

## Data Analysis
For simple analysis, we use MongoDB's mapReduce features. Examples can be found in ```scripts/analytics```. The scripts use the standard mongodb driver for node to generate new collections in Mongo based on the supplied map and reduce functions.

## Data Server
In order to start to visualize some of the data, I've created a basic express application that can query the Mongo database and supply the results to a client in standard JSON format.