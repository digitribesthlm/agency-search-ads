const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'agency-search-ads'

async function checkUsers() {
  let client
  
  try {
    console.log('Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db(MONGODB_DB)
    
    // Get all users
    const users = await db.collection('users').find({}).toArray()
    
    console.log(`Found ${users.length} users in the database:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Status: ${user.status}`)
      console.log(`   Account ID: ${user['Account ID']}`)
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`)
      console.log('---')
    })
    
  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Run the script
checkUsers()

