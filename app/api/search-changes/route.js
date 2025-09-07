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

    // Only admins can view change history
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const ad_id = searchParams.get('ad_id')
    const campaign_id = searchParams.get('campaign_id')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit')) || 50

    const { db } = await connectDB()

    // Build query
    const query = {}
    if (ad_id) query.ad_id = ad_id
    if (campaign_id) query.campaign_id = campaign_id
    if (action) query.action = action

    const changes = await db.collection('search_ad_changes')
      .find(query)
      .sort({ changed_at: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({
      success: true,
      data: changes
    })

  } catch (error) {
    console.error('Error fetching changes:', error)
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

    const changeData = await request.json()

    // Validation
    if (!changeData.ad_id || !changeData.action) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { db } = await connectDB()

    // Create change record
    const newChange = {
      ...changeData,
      changed_by: session.user.email,
      user_role: session.user.role,
      changed_at: new Date(),
      needs_google_ads_update: true,
      is_pending_change: true,
      approval_status: 'PENDING'
    }

    const result = await db.collection('search_ad_changes').insertOne(newChange)

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId },
      message: 'Change logged successfully'
    })

  } catch (error) {
    console.error('Error logging change:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

