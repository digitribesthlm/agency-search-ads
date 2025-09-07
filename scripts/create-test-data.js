const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agency-search-ads'

async function createTestData() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('agency-search-ads')

    // Create collections
    const users = db.collection('users')
    const searchAds = db.collection('search_ads')
    const searchAdChanges = db.collection('search_ad_changes')

    // Clear existing data
    await users.deleteMany({})
    await searchAds.deleteMany({})
    await searchAdChanges.deleteMany({})

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const testUsers = [
      {
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        name: 'Admin User',
        status: 'active',
        'Account ID': '3729097555',
        created_at: new Date(),
        last_login: new Date()
      },
      {
        email: 'client@example.com',
        password: hashedPassword,
        role: 'client',
        name: 'Client User',
        status: 'active',
        'Account ID': '3729097555',
        created_at: new Date(),
        last_login: new Date()
      }
    ]

    await users.insertMany(testUsers)

    // Create test search ads
    const testAds = [
      {
        account_id: '3729097555',
        account_name: 'Climber AB',
        campaign_id: '209687521',
        campaign_name: 'Climber.se - Search',
        ad_group_id: '66113329850',
        ad_group_name: 'Pris - QlikView',
        ad_id: '352013070441',
        ad_type: 'RESPONSIVE_SEARCH_AD',
        headlines: [
          'QlikView Pricing Plans',
          'Best QlikView Deals',
          'QlikView Cost Calculator',
          'Affordable QlikView',
          'QlikView License Options'
        ],
        descriptions: [
          'Find the perfect QlikView pricing plan for your business needs. Compare features and costs.',
          'Get the best deals on QlikView licenses. Save money with our competitive pricing.'
        ],
        headline_count: 5,
        description_count: 2,
        status: 'ACTIVE',
        is_pending: false,
        unique_id: uuidv4(),
        composite_id: '209687521_66113329850_352013070441',
        created_at: new Date(),
        created_by: 'admin@example.com',
        last_modified: new Date(),
        last_modified_by: 'admin@example.com',
        last_sync: new Date(),
        sync_source: 'google_ads'
      },
      {
        account_id: '3729097555',
        account_name: 'Climber AB',
        campaign_id: '209687521',
        campaign_name: 'Climber.se - Search',
        ad_group_id: '66113329850',
        ad_group_name: 'Pris - QlikView',
        ad_id: '352013070442',
        ad_type: 'RESPONSIVE_SEARCH_AD',
        headlines: [
          'QlikView Free Trial',
          'Test QlikView Today',
          'QlikView Demo Available'
        ],
        descriptions: [
          'Start your free QlikView trial today. No credit card required.',
          'Experience QlikView with our free demo. See how it can help your business.'
        ],
        headline_count: 3,
        description_count: 2,
        status: 'ACTIVE',
        is_pending: false,
        unique_id: uuidv4(),
        composite_id: '209687521_66113329850_352013070442',
        created_at: new Date(),
        created_by: 'admin@example.com',
        last_modified: new Date(),
        last_modified_by: 'admin@example.com',
        last_sync: new Date(),
        sync_source: 'google_ads'
      },
      {
        account_id: '3729097555',
        account_name: 'Climber AB',
        campaign_id: '209687521',
        campaign_name: 'Climber.se - Search',
        ad_group_id: '66113329851',
        ad_group_name: 'Support - QlikView',
        ad_id: '352013070443',
        ad_type: 'RESPONSIVE_SEARCH_AD',
        headlines: [
          'QlikView Support 24/7',
          'Expert QlikView Help',
          'QlikView Technical Support',
          'QlikView Training Available'
        ],
        descriptions: [
          'Get 24/7 QlikView support from our expert team. Fast response times guaranteed.',
          'Professional QlikView training and support services. Learn from the experts.'
        ],
        headline_count: 4,
        description_count: 2,
        status: 'PAUSED',
        is_pending: false,
        unique_id: uuidv4(),
        composite_id: '209687521_66113329851_352013070443',
        created_at: new Date(),
        created_by: 'admin@example.com',
        last_modified: new Date(),
        last_modified_by: 'admin@example.com',
        last_sync: new Date(),
        sync_source: 'google_ads'
      }
    ]

    await searchAds.insertMany(testAds)

    // Create some test changes
    const testChanges = [
      {
        change_id: uuidv4(),
        ad_id: '352013070441',
        campaign_id: '209687521',
        campaign_name: 'Climber.se - Search',
        ad_group_id: '66113329850',
        ad_group_name: 'Pris - QlikView',
        action: 'ADD_HEADLINE',
        field_changed: 'headlines[4]',
        old_value: '',
        new_value: 'QlikView License Options',
        changed_by: 'admin@example.com',
        user_role: 'admin',
        changed_at: new Date(),
        needs_google_ads_update: true
      },
      {
        change_id: uuidv4(),
        ad_id: '352013070443',
        campaign_id: '209687521',
        campaign_name: 'Climber.se - Search',
        ad_group_id: '66113329851',
        ad_group_name: 'Support - QlikView',
        action: 'PAUSE_AD',
        field_changed: 'status',
        old_value: 'ACTIVE',
        new_value: 'PAUSED',
        changed_by: 'client@example.com',
        user_role: 'client',
        changed_at: new Date(),
        needs_google_ads_update: true
      }
    ]

    await searchAdChanges.insertMany(testChanges)

    console.log('✅ Test data created successfully!')
    console.log('📧 Test users:')
    console.log('   - admin@example.com (password: password123)')
    console.log('   - client@example.com (password: password123)')
    console.log('📊 Created 3 test ads across 2 ad groups in 1 campaign')
    console.log('📋 Created 2 test change records')

  } catch (error) {
    console.error('❌ Error creating test data:', error)
  } finally {
    await client.close()
  }
}

createTestData()


