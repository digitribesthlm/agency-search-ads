import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../auth/[...nextauth]/route'
import { connectDB } from '../../../../../lib/mongodb'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can reject changes
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { pending_id } = params
    const { rejection_reason } = await request.json()
    const { db } = await connectDB()

    // Get the pending ad
    const pendingAd = await db.collection('pending_search_ads').findOne({
      ad_id: pending_id,
      approval_status: 'PENDING'
    })

    if (!pendingAd) {
      return NextResponse.json(
        { success: false, message: 'Pending change not found or already processed' },
        { status: 404 }
      )
    }

    // Update approval status to rejected
    await db.collection('pending_search_ads').updateOne(
      { ad_id: pending_id },
      {
        $set: {
          approval_status: 'REJECTED',
          approved_by: session.user.email,
          approved_at: new Date(),
          rejection_reason: rejection_reason || 'No reason provided'
        }
      }
    )

    // Log the rejection
    await db.collection('search_ad_changes').insertOne({
      change_id: uuidv4(),
      ad_id: pendingAd.original_ad_id || pendingAd.ad_id,
      campaign_id: pendingAd.campaign_id,
      campaign_name: pendingAd.campaign_name,
      ad_group_id: pendingAd.ad_group_id,
      ad_group_name: pendingAd.ad_group_name,
      action: 'REJECT_CHANGE',
      field_changed: 'all',
      old_value: 'PENDING',
      new_value: 'REJECTED',
      changed_by: session.user.email,
      user_role: 'admin',
      changed_at: new Date(),
      needs_google_ads_update: false,
      is_pending_change: false,
      pending_id: pending_id,
      approval_status: 'REJECTED',
      rejection_reason: rejection_reason || 'No reason provided'
    })

    return NextResponse.json({
      success: true,
      message: 'Change rejected successfully'
    })

  } catch (error) {
    console.error('Error rejecting pending ad:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

