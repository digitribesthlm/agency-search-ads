import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { connectDB } from '../../../../lib/mongodb'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { campaign_id } = params

    const { db } = await connectDB()

    // ✅ UPDATED: Get campaign info with COMPLETE business logic for status
    const campaignAgg = await db.collection('search_ads').aggregate([
      {
        $match: {
          campaign_id: campaign_id,
          account_id: session.user.accountId,
          status: { $ne: 'REMOVED' }
        }
      },
      // First group by ad groups to get detailed counts
      {
        $group: {
          _id: {
            campaign_id: '$campaign_id',
            campaign_name: '$campaign_name',
            account_id: '$account_id',
            account_name: '$account_name',
            campaign_status: '$campaign_status',
            ad_group_id: '$ad_group_id'
          },
          ad_count_in_group: { $sum: 1 },
          earliest_created_at: { $min: '$created_at' },
          active_count_in_group: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          paused_count_in_group: { $sum: { $cond: [{ $eq: ['$status', 'PAUSED'] }, 1, 0] } },
          ad_group_status: { $first: '$ad_group_status' }
        }
      },
      // Then group by campaign to get totals
      {
        $group: {
          _id: {
            campaign_id: '$_id.campaign_id',
            campaign_name: '$_id.campaign_name',
            account_id: '$_id.account_id',
            account_name: '$_id.account_name',
            campaign_status: '$_id.campaign_status'
          },
          ad_group_count: { $sum: 1 },
          total_ad_count: { $sum: '$ad_count_in_group' },
          earliest_created_at: { $min: '$earliest_created_at' },
          total_active_count: { $sum: '$active_count_in_group' },
          total_paused_count: { $sum: '$paused_count_in_group' },
          active_groups_count: {
            $sum: {
              $cond: [
                { $eq: ['$ad_group_status', 'ENABLED'] },
                1,
                0
              ]
            }
          },
          paused_groups_count: {
            $sum: {
              $cond: [
                { $eq: ['$ad_group_status', 'PAUSED'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          campaign_id: '$_id.campaign_id',
          campaign_name: '$_id.campaign_name',
          account_id: '$_id.account_id',
          account_name: '$_id.account_name',
          campaign_status: '$_id.campaign_status',
          ad_group_count: '$ad_group_count',
          ad_count: '$total_ad_count',
          active_count: '$total_active_count',
          paused_count: '$total_paused_count',
          active_groups_count: '$active_groups_count',
          paused_groups_count: '$paused_groups_count',
          created_at: '$earliest_created_at',
          // ✅ COMPLETE BUSINESS LOGIC: Campaign is PAUSED if ANY of these conditions:
          // 1. Campaign Status = PAUSED, OR
          // 2. All Ad Groups are PAUSED (active_groups_count = 0), OR  
          // 3. All Ads are PAUSED (active_count = 0)
          status: {
            $cond: [
              // Condition 1: Campaign itself is PAUSED
              { $eq: ['$_id.campaign_status', 'PAUSED'] },
              'PAUSED',
              // Condition 2: All ad groups are PAUSED (no active groups)
              {
                $cond: [
                  { $eq: ['$active_groups_count', 0] },
                  'PAUSED',
                  // Condition 3: All ads are PAUSED (no active ads)
                  {
                    $cond: [
                      { $eq: ['$total_active_count', 0] },
                      'PAUSED',
                      // Only ENABLED if campaign is enabled AND has active groups AND active ads
                      'ENABLED'
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    ]).toArray()

    const campaign = campaignAgg[0]

    if (!campaign) {
      return NextResponse.json(
        { success: false, message: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaign

    return NextResponse.json({
      success: true,
      data: campaignData
    })

  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
