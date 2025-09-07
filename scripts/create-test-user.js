const bcrypt = require('bcryptjs')
const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agency-search-ads'
const MONGODB_DB = process.env.MONGODB_DB || 'agency-search-ads'

async function createTestUser() {
  let client
  
  try {
    console.log('Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db(MONGODB_DB)
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email: 'test@example.com' })
    if (existingUser) {
      console.log('Test user already exists!')
      console.log('Email: test@example.com')
      console.log('Password: password123')
      return
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    const user = {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'client',
      status: 'active',
      created_at: new Date(),
      last_login: null,
      'Account ID': '3729097555'
    }
    
    const result = await db.collection('users').insertOne(user)
    
    console.log('✅ Test user created successfully!')
    console.log('Email: test@example.com')
    console.log('Password: password123')
    console.log('User ID:', result.insertedId)
    
  } catch (error) {
    console.error('❌ Error creating test user:', error)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Run the script
createTestUser()

