# MNHS Newspaper Data Analysis & Visualization

## Summary
This repository holds code used to fetch and analyze the MNHS newspaper archives found on chroniclingamerica.loc.gov. **Note: Data is not included in this repository, but can be fetched using the scripts provided.**

## Loading Data
The data is downloaded and stored in a local MongoDB using the scripts in ```scripts/chronicling_america_download```. At present, these must be run in sequence; eventually they could be refactored into a single script with a flexible API that performs the entire download (and perhaps could download any of the batches available on Chronicling America). There is much room for optimization via the use of multiple threads and bulk writes to Mongo.

### Usage
In order to obtain the entire dataset locally:

1. Install MongoDB on your local machine, and create a database called 'mnhs'.
2. With the Mongo server running
	a. run `$ node ca.js` in order to download all of the MNHS batches into a 'batches' collection
	b. run `$ node ca_add_editions.js` to loop through batches and download all of the editions in each batch into an 'editions' colleciton.
	c. run `$ node ca_add_ocr.js` to loop through the editions and fetch/add the corresponding OCR text for each page in the edition.

Because there are some 400,000 pages in the archive, the last step takes a very long time -- on the order of hours (6 to 12?), depending on the speed of your machine and connection. Once it's complete, you'll have a collection in your local MongoDB that contains all of the editions, with each edition document containing the OCR text for each page in the edition, as shown below.

## Data Structure in MongoDB
The structure in MongoDB is as shown below. For pages where OCR text does exist, it is included in the ```ocr``` property. The example below does not have OCR available, thus shows "no_text" in this field.

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
		}
	]
}
```

## Data Analysis
For simple analysis, we use MongoDB's MapReduce features. A few example scripts can be found in ```scripts/analytics```. The scripts use the standard mongodb driver for node to generate new collections in Mongo based on the supplied map and reduce functions.

### Usage
Once we determined one type of analysis that we wanted to repeat, we created a basic cli tool that would allow us to generate the desired data quickly with different input parameters. The words_per_total_cli.js script is passed an aggregation level followed by the search terms.

```
$ node words_per_total_cli.js issue|day|week|month|year searchTerm1 [searchTerm2] ... [searchTermN]
```

### Example

``` bash
$ node words_per_total_cli.js month war peace
```

The example here will find the occurrences of the words 'war' and 'peace' per total words, aggregated by month.

The new collection will be called 'war_peace_occurrences_per_total_by_month' and will contain documents in the following format:

``` json
{
   "_id" : "1856-01-01T05:00:00.000Z",
   "value" : {
       "totalWords" : 27163,
       "words" : [
           {
               "word" : "war",
               "total_occurrences" : 2,
               "occurrences_per_total" : 0.00007362956963516548,
               "occurrences_percent" : 0.39999999999999997
           },
           {
               "word" : "peace",
               "total_occurrences" : 3,
               "occurrences_per_total" : 0.00011044435445274823,
               "occurrences_percent" : 0.6
           }
       ]
   }
}
```

## Data Server
In order to start to visualize some of the data, we've created a basic Express application that performs queries on the Mongo database and supplies the results to a client in standard JSON format.

# Todos

- Add more functionality to express server for ease of use
- MOAR VISUALIZATIONS
	- Simple dashboard to give us a lay-o-the-land
	- Do some tests with more interesting questions/data
		- Immigrant populations ("Norwegians", "Swedes" etc.)
		- Weather ("snow" etc.)
		- Spread of disease, etc
		- Cultural trends?
	- Could we do an OCR quality / legibility rating?
- Scripts for generating corpii based on queries? Is that actually helpful?
