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

    // Only admins can approve changes
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { pending_id } = params
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

    // Update approval status
    await db.collection('pending_search_ads').updateOne(
      { ad_id: pending_id },
      {
        $set: {
          approval_status: 'APPROVED',
          approved_by: session.user.email,
          approved_at: new Date()
        }
      }
    )

    // If it's a modification, update the live ad
    if (pendingAd.pending_action === 'MODIFY_AD' && pendingAd.original_ad_id) {
      await db.collection('search_ads').updateOne(
        { ad_id: pendingAd.original_ad_id },
        {
          $set: {
            headlines: pendingAd.headlines,
            descriptions: pendingAd.descriptions,
            headline_count: pendingAd.headline_count,
            description_count: pendingAd.description_count,
            final_url: pendingAd.final_url,
            last_modified: new Date(),
            last_modified_by: session.user.email,
            needs_google_ads_update: true
          }
        }
      )
    }

    // If it's a new ad, create it in live collection
    if (pendingAd.pending_action === 'CREATE_AD') {
      const liveAd = {
        ...pendingAd,
        ad_id: pendingAd.original_ad_id || pendingAd.ad_id.replace('PENDING_', ''),
        status: 'ACTIVE',
        is_pending: false,
        needs_google_ads_update: true,
        last_modified: new Date(),
        last_modified_by: session.user.email
      }
      delete liveAd.pending_action
      delete liveAd.approval_status
      delete liveAd.approved_by
      delete liveAd.approved_at
      delete liveAd.rejection_reason

      await db.collection('search_ads').insertOne(liveAd)
    }

    // Log the approval
    await db.collection('search_ad_changes').insertOne({
      change_id: uuidv4(),
      ad_id: pendingAd.original_ad_id || pendingAd.ad_id,
      campaign_id: pendingAd.campaign_id,
      campaign_name: pendingAd.campaign_name,
      ad_group_id: pendingAd.ad_group_id,
      ad_group_name: pendingAd.ad_group_name,
      action: 'APPROVE_CHANGE',
      field_changed: 'all',
      old_value: 'PENDING',
      new_value: 'APPROVED',
      changed_by: session.user.email,
      user_role: 'admin',
      changed_at: new Date(),
      needs_google_ads_update: false,
      is_pending_change: false,
      pending_id: pending_id,
      approval_status: 'APPROVED'
    })

    return NextResponse.json({
      success: true,
      message: 'Change approved successfully'
    })

  } catch (error) {
    console.error('Error approving pending ad:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

