// run this program to preload the source database with data

const mongodb = require('mongodb')
const fs = require('fs')
const path = require('path')
const MongoClient = mongodb.MongoClient
const url = 'mongodb://localhost:27017/'

const customers = JSON.parse(fs.readFileSync(path.join(__dirname,'m3-customer-data.json')))
const addresses = JSON.parse(fs.readFileSync(path.join(__dirname,'./m3-customer-address-data.json')))

MongoClient.connect(url,(err,database) => {
    if(err) return process.exit(1)
    const myDb =database.db('customers')
    console.log('Ok connected successfully')
    insertDocuments(myDb,customers,'customers',()=>{
        insertDocuments(myDb,addresses,'addresses',()=>{
            console.log("Finished loading records")    
            database.close()
        })
    })
})

const insertDocuments= (database,objectList,collectionName,callback)=>{
    var collection = database.collection(collectionName)
    collection.insert(objectList,(error,result)=>{
        if(error) return process.exit(1)
        console.log(result.result.n)
         console.log(result.ops.length)
         console.log(`Inserted ${result.result.n}  documents into the ${collectionName} collection`)
         callback(result)
    })
}

