import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '../../../lib/mongodb'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get('campaign_id')
    const ad_group_id = searchParams.get('ad_group_id')
    const status = searchParams.get('status')

    const { db } = await connectDB()

    // Build query
    const query = {
      account_id: session.user.accountId,
      status: { $ne: 'REMOVED' }
    }

    if (campaign_id) query.campaign_id = campaign_id
    if (ad_group_id) query.ad_group_id = ad_group_id
    if (status) query.status = status

    const ads = await db.collection('search_ads')
      .find(query)
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: ads
    })

  } catch (error) {
    console.error('Error fetching ads:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adData = await request.json()

    // Validation
    if (!adData.campaign_id || !adData.ad_group_id || !adData.ad_type) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!adData.headlines || adData.headlines.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one headline is required' },
        { status: 400 }
      )
    }

    if (!adData.descriptions || adData.descriptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one description is required' },
        { status: 400 }
      )
    }

    const { db } = await connectDB()

    // Create new ad
    const newAd = {
      ...adData,
      account_id: session.user.accountId,
      headline_count: adData.headlines.length,
      description_count: adData.descriptions.length,
      status: 'ACTIVE',
      is_pending: false,
      unique_id: require('uuid').v4(),
      composite_id: `${adData.campaign_id}_${adData.ad_group_id}_${adData.ad_id}`,
      created_at: new Date(),
      created_by: session.user.email,
      last_modified: new Date(),
      last_modified_by: session.user.email,
      last_sync: new Date(),
      sync_source: 'web_app'
    }

    const result = await db.collection('search_ads').insertOne(newAd)

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId },
      message: 'Ad created successfully'
    })

  } catch (error) {
    console.error('Error creating ad:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

