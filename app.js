var Promise = require("bluebird");
var AsyncLock = require('async-lock');
var asyncP = require('async-promises');
const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient

const url = 'mongodb://localhost:27017/'
const connectionOptions = { server: {reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000, socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 }   },
    replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }    }
const sourceDb = 'customers'
const targetDb = 'updatedCustomers'
const custCollName = 'customers'
addressCollName = 'addresses'
const lockKey = 'destArray'

var lock = new AsyncLock();
let numberOfDocuments =0
let numberOfQueries =0
let recordsPerQuery =parseInt(process.argv[2])
let customers =[]
let addresses = []
//var insertArray =[]

function countBaseRecordsP(db,collectionName){
    return new Promise(function (resolve, reject){
		db.collection(collectionName, {strict:true}, function(error, collection){
			if (error) {
				console.log("Could not access collection: " + error.message);
				reject(error.message);
			} else {
				collection.count()
				.then(
					function(count) {
						resolve(count);
					},
					function(err) {
						console.log("countDocuments failed: " + err.message);
						reject(err.message);
					}
				)
			}
		});
	})
}

function doReadP(database,collectionName,destArray,page,pageSize){
    return new Promise(function(resolve,reject){
        var collection = database.collection(collectionName, {strict:true}, function(error, collection){
			if (error) {
				console.log("Could not access collection: " + error.message);
				reject(error.message);
			} else {
                var index = page * pageSize
                var options = {skip:index,limit:pageSize}
                collection.find({}, options).toArray()
                .then(
                    function(docs){
                        lock.acquire(lockKey,()=>concatenateOutputP(destArray,index,pageSize,docs))
                        .then((destArray)=>{
                            console.log(`Successfully read ${collectionName} records ${docs.length} first record ${JSON.stringify(docs[0]).slice(0,75)}`)
                            resolve(docs)
                        },function(error){
                            console.log(error)
                            reject(error)
                        })
                },
                function(err) {
                    console.log("doReadP failed: " + err.message);
                    reject(err.message);
                })
            }
        })
    })
}

function doWriteP(database,collectionName,sourceArray){
    return new Promise(function(resolve,reject){
        var collection = database.collection(collectionName, function(error, collection){
			if (error) {
				console.log("Could not access collection: " + error.message);
				reject(error.message);
			} else {
                 console.log(`Starting to insert array size ${sourceArray.length} first record Id ${sourceArray[0].id}`)
                collection.insertMany(sourceArray)
                .then(
    		        function(result) {
					resolve(result);
			    },function(err) {
                    console.log("Insert failed: " + err.message)
					reject(err.message);
				    }
			    )
            }
        })
    })
}

function concatenateOutputP(destArray,index,pageSize,items){
    return new Promise(function(resolve,reject){
        if(index <0 || pageSize <0 || destArray === undefined || items === undefined)
            reject('Invalid input params for concatenate output')
        destArray.splice(index,pageSize,...items)
        resolve(destArray)
    })
}

function processTasks(taskArray){
    return asyncP.parallel(taskArray)
}
    

// Entry Point
if(isNaN(recordsPerQuery)){
    console.log("Invalid number of records to process --> Input")
    process.exit(1)
}

MongoClient.connect(url)
    .then(
        function(database){
            var myDb =database.db(sourceDb)
            console.log(`Ok connected successfully to ${myDb.databaseName}`)
            countBaseRecordsP(myDb,custCollName)
                .then (
                    function(num){
                        numberOfDocuments = num
                        numberOfQueries = numberOfDocuments/recordsPerQuery
                        customers = new Array(numberOfDocuments)
                        console.log(`Required queries = ${numberOfQueries}`)
                        console.log(`Number of Documents : ${numberOfDocuments}`)
                        let tasks = []
                        let addressTasks = []
                        for (let i = 0; i < numberOfQueries; i++) {
                            tasks.push(doReadP(myDb,custCollName, customers,i,recordsPerQuery ))
                            tasks.push(doReadP(myDb,addressCollName, addresses,i,recordsPerQuery ))
                        }
                        processTasks(tasks)
                            .then(
                                function(){
                                    customers.forEach((customer, index, list) => {
                                        customers[index] = Object.assign(customer, addresses[index])
                                    })
                                    var newDb =database.db(targetDb)
                                    let writeTasks = []
                                    let cloneCustomers = customers.slice(0)
                                    for (let i = 0; i < numberOfQueries; i++) {
                                        var index = i * recordsPerQuery
                                        var newArray = cloneCustomers.splice(0,recordsPerQuery)
                                        //insertArray.push(newArray)
                                        writeTasks.push(doWriteP(newDb,custCollName, newArray))
                                    }
                                    processTasks(writeTasks)
                                        .then(
                                            function(){
                                                console.log("Write is complete")
                                                process.exit(0)
                                            },function(error){
                                                console.log(error)
                                            }
                                        )
                                })
                    })
        },function(err){
                        console.log(err)
    },function(err){
        if(err) return process.exit(1)        
    })
