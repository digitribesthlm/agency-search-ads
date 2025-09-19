import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { connectDB } from '../../../../../lib/mongodb'

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

    // ✅ UPDATED: Get ad groups with campaign status consideration
    const adGroups = await db.collection('search_ads').aggregate([
      {
        $match: {
          campaign_id: campaign_id,
          account_id: session.user.accountId,
          status: { $ne: 'REMOVED' }
        }
      },
      {
        $group: {
          _id: {
            ad_group_id: '$ad_group_id',
            ad_group_name: '$ad_group_name',
            campaign_status: '$campaign_status'  // ✅ ADDED: Include campaign status
          },
          ad_count: { $sum: 1 },
          created_at: { $min: '$created_at' },
          ad_group_status: { $first: '$ad_group_status' },
          active_count: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          paused_count: { $sum: { $cond: [{ $eq: ['$status', 'PAUSED'] }, 1, 0] } }
        }
      },
      {
        $project: {
          ad_group_id: '$_id.ad_group_id',
          ad_group_name: '$_id.ad_group_name',
          campaign_status: '$_id.campaign_status',  // ✅ ADDED: Include campaign status
          ad_count: '$ad_count',
          active_count: '$active_count',
          paused_count: '$paused_count',
          created_at: '$created_at',
          ad_group_status: '$ad_group_status',
          // ✅ FIXED: Ad group status logic considers campaign status
          // If campaign is PAUSED, ad group should show as PAUSED regardless of its own status
          // If campaign is ENABLED, use ad group's own status
          status: {
            $cond: [
              // If campaign is PAUSED, ad group is effectively PAUSED
              { $eq: ['$_id.campaign_status', 'PAUSED'] },
              'PAUSED',
              // If campaign is ENABLED, check ad group status and content
              {
                $cond: [
                  // If ad group itself is PAUSED, show PAUSED
                  { $eq: ['$ad_group_status', 'PAUSED'] },
                  'PAUSED',
                  // If ad group is ENABLED but has no active ads, show PAUSED
                  {
                    $cond: [
                      { $eq: ['$active_count', 0] },
                      'PAUSED',
                      // Ad group is ENABLED and has active ads
                      'ENABLED'
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]).toArray()

    return NextResponse.json({
      success: true,
      data: adGroups
    })

  } catch (error) {
    console.error('Error fetching ad groups:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
