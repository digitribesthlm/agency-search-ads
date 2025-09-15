const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'agency-search-ads'

async function checkAllCollections() {
  let client
  
  try {
    console.log('Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db(MONGODB_DB)
    
    // List all collections
    const collections = await db.listCollections().toArray()
    console.log('Available collections:')
    collections.forEach(col => {
      console.log(`- ${col.name}`)
    })
    
    console.log('\n--- Checking each collection for users ---')
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments()
      console.log(`\n${collection.name}: ${count} documents`)
      
      if (collection.name.toLowerCase().includes('user') || count < 10) {
        const sample = await db.collection(collection.name).find({}).limit(3).toArray()
        console.log('Sample documents:')
        sample.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${JSON.stringify(doc, null, 2)}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Run the script
checkAllCollections()

