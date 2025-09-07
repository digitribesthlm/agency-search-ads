import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { connectDB } from '../../../../lib/mongodb'
import { v4 as uuidv4 } from 'uuid'

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
    const { 
      ad_id, 
      campaign_id, 
      ad_group_id, 
      campaign_name, 
      ad_group_name,
      action, 
      field_changed, 
      old_value, 
      new_value 
    } = changeData

    // Validation
    if (!ad_id || !campaign_id || !ad_group_id || !action) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { db } = await connectDB()

    // Create change record
    const changeRecord = {
      change_id: uuidv4(),
      ad_id: ad_id,
      campaign_id: campaign_id,
      campaign_name: campaign_name,
      ad_group_id: ad_group_id,
      ad_group_name: ad_group_name,
      action: action, // ADD_HEADLINE, EDIT_HEADLINE, REMOVE_HEADLINE, ADD_DESCRIPTION, EDIT_DESCRIPTION, REMOVE_DESCRIPTION
      field_changed: field_changed,
      old_value: old_value,
      new_value: new_value,
      changed_by: session.user.email,
      user_role: session.user.role,
      changed_at: new Date(),
      needs_google_ads_update: true,
      is_pending_change: true,
      status: 'PENDING', // PENDING, COMPLETED
      completed_at: null,
      completed_by: null
    }

    const result = await db.collection('search_ad_changes').insertOne(changeRecord)

    return NextResponse.json({
      success: true,
      data: { 
        change_id: changeRecord.change_id,
        status: 'PENDING'
      },
      message: 'Change recorded and marked as PENDING'
    })

  } catch (error) {
    console.error('Error recording change:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const status = searchParams.get('status') || 'PENDING'
    const ad_id = searchParams.get('ad_id')

    const { db } = await connectDB()

    // Build query
    const query = { status: status }
    if (ad_id) {
      query.ad_id = ad_id
    }

    // If client user, only show their changes
    if (session.user.role !== 'admin') {
      query.changed_by = session.user.email
    }

    const changes = await db.collection('search_ad_changes')
      .find(query)
      .sort({ changed_at: -1 })
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
