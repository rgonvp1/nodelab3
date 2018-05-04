# nodelab3
lab 3

Reading carefully the assignment, it indicates that the data is stored in a database, and the reads have also be parallelized, so the lab is divided in two parts
The lab is implemented in two parts : 
    1. loaddb.js  - reads the json files and inserts the records into the customers and addresses collections. THIS NEEDS TO BE RUN BEFORE THE SECOND APP
    2. app.js - performs the process of reading in parallel from db, merges data and writes to a new database in parallel too. 


I started to get anoyed about the callback syntax, seems to me that the code starts to get disordered and really unreadable. Then I started to learn about Promises, and that model made me feel that the code could be a little cleaner and understandable for other programers. 

I defined 5 functions:
1. countBaseRecordsP => gets the number of records to process from the source database. returns a promise
2. doReadP => performs a database read on an specific db, collection, page, and number of records. returns a promise. The results are put in an array by concatenateOutputP by locking the access on the array in case of parallel reading
3. concatenateOutputP => Makes the concatenation of the results from reading into an array
4. doWriteP => writes data to database on an specific db, collection and a set of records. returns a promise
5. processTasks => performs a parallel execution on an array of functions that return promises

The main program performs:
 - Validation of input (number of records per chunk)
 - Connection to Db
 - Total records count
 - calculation of number of chunks and creation of parallel reading tasks
 - execution of parallel reads and concatenation of customer and address records
 - creation and execution of parallel writing tasks

NPM Modules used:
- mongodb
- bluebirdjs
- async-lock
- async-promises
