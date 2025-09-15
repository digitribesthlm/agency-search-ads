import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '../../../lib/mongodb'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can view all pending changes
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const approval_status = searchParams.get('approval_status') || 'PENDING'
    const account_id = searchParams.get('account_id')

    const { db } = await connectDB()

    // Build query
    const query = {
      approval_status: approval_status
    }

    if (account_id) {
      query.account_id = account_id
    }

    const pendingAds = await db.collection('pending_search_ads')
      .find(query)
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: pendingAds
    })

  } catch (error) {
    console.error('Error fetching pending ads:', error)
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

    const pendingData = await request.json()

    const isStatusAction = ['PAUSE_AD', 'RESUME_AD', 'REMOVE_AD'].includes(pendingData.pending_action)

    // Validation
    if (!pendingData.campaign_id || !pendingData.ad_group_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // For creative edits/new ads, enforce content validation. For status actions, allow minimal payload.
    if (!isStatusAction) {
      if (!pendingData.ad_type) {
        return NextResponse.json(
          { success: false, message: 'ad_type is required' },
          { status: 400 }
        )
      }
      if (!pendingData.headlines || pendingData.headlines.length === 0) {
        return NextResponse.json(
          { success: false, message: 'At least one headline is required' },
          { status: 400 }
        )
      }
      if (!pendingData.descriptions || pendingData.descriptions.length === 0) {
        return NextResponse.json(
          { success: false, message: 'At least one description is required' },
          { status: 400 }
        )
      }
    }

    const { db } = await connectDB()

    // Generate unique pending ID
    const pendingId = `PENDING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    let newPendingAd

    if (isStatusAction) {
      // For status changes, validate original_ad_id and derive current data from live ad
      if (!pendingData.original_ad_id) {
        return NextResponse.json(
          { success: false, message: 'original_ad_id is required for status changes' },
          { status: 400 }
        )
      }

      const liveAd = await db.collection('search_ads').findOne({
        ad_id: pendingData.original_ad_id,
        account_id: session.user.accountId
      })

      if (!liveAd) {
        return NextResponse.json(
          { success: false, message: 'Live ad not found' },
          { status: 404 }
        )
      }

      const targetStatus = pendingData.pending_action === 'PAUSE_AD' ? 'PAUSED'
        : pendingData.pending_action === 'RESUME_AD' ? 'ACTIVE'
        : 'REMOVED'

      newPendingAd = {
        ad_id: pendingId,
        original_ad_id: liveAd.ad_id,
        account_id: liveAd.account_id,
        account_name: liveAd.account_name,
        campaign_id: liveAd.campaign_id,
        campaign_name: liveAd.campaign_name,
        ad_group_id: liveAd.ad_group_id,
        ad_group_name: liveAd.ad_group_name,
        ad_type: liveAd.ad_type,
        headlines: liveAd.headlines,
        descriptions: liveAd.descriptions,
        headline_count: liveAd.headline_count,
        description_count: liveAd.description_count,
        final_url: liveAd.final_url,
        status: 'PENDING_APPROVAL',
        is_pending: true,
        unique_id: uuidv4(),
        composite_id: `${liveAd.campaign_id}_${liveAd.ad_group_id}_${pendingId}`,
        created_at: new Date(),
        created_by: session.user.email,
        last_modified: new Date(),
        last_modified_by: session.user.email,
        sync_source: 'user_input',
        needs_google_ads_update: true,
        pending_action: pendingData.pending_action,
        approval_status: 'PENDING',
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        status_change: { from: liveAd.status, to: targetStatus }
      }
    } else {
      // Create pending ad (creative/content changes)
      newPendingAd = {
        ...pendingData,
        ad_id: pendingId,
        account_id: session.user.accountId,
        headline_count: pendingData.headlines.length,
        description_count: pendingData.descriptions.length,
        status: 'PENDING_APPROVAL',
        is_pending: true,
        unique_id: uuidv4(),
        composite_id: `${pendingData.campaign_id}_${pendingData.ad_group_id}_${pendingId}`,
        created_at: new Date(),
        created_by: session.user.email,
        last_modified: new Date(),
        last_modified_by: session.user.email,
        sync_source: 'user_input',
        needs_google_ads_update: true,
        pending_action: pendingData.pending_action || 'MODIFY_AD',
        approval_status: 'PENDING',
        approved_by: null,
        approved_at: null,
        rejection_reason: null
      }
    }

    const result = await db.collection('pending_search_ads').insertOne(newPendingAd)

    // Log the change
    if (isStatusAction) {
      await db.collection('search_ad_changes').insertOne({
        change_id: uuidv4(),
        ad_id: newPendingAd.original_ad_id,
        campaign_id: newPendingAd.campaign_id,
        campaign_name: newPendingAd.campaign_name,
        ad_group_id: newPendingAd.ad_group_id,
        ad_group_name: newPendingAd.ad_group_name,
        action: pendingData.pending_action,
        field_changed: 'status',
        old_value: newPendingAd.status_change.from,
        new_value: newPendingAd.status_change.to,
        changed_by: session.user.email,
        user_role: session.user.role,
        changed_at: new Date(),
        needs_google_ads_update: true,
        is_pending_change: true,
        pending_id: pendingId,
        approval_status: 'PENDING'
      })
    } else {
      await db.collection('search_ad_changes').insertOne({
        change_id: uuidv4(),
        ad_id: pendingId,
        campaign_id: pendingData.campaign_id,
        campaign_name: pendingData.campaign_name,
        ad_group_id: pendingData.ad_group_id,
        ad_group_name: pendingData.ad_group_name,
        action: pendingData.pending_action || 'MODIFY_AD',
        field_changed: 'all',
        old_value: null,
        new_value: 'Pending modification',
        changed_by: session.user.email,
        user_role: session.user.role,
        changed_at: new Date(),
        needs_google_ads_update: true,
        is_pending_change: true,
        pending_id: pendingId,
        approval_status: 'PENDING'
      })
    }

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId, pending_id: pendingId },
      message: 'Change submitted for approval',
      isPending: true
    })

  } catch (error) {
    console.error('Error creating pending ad:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

