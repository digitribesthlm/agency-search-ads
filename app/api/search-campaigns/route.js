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

    const { db } = await connectDB()

    // Get campaigns for the user's account with proper status logic using ENABLED terminology
    const campaigns = await db.collection('search_ads').aggregate([
      {
        $match: {
          account_id: session.user.accountId,
          status: { $ne: 'REMOVED' }
        }
      },
      // First group by ad groups to get their status
      {
        $group: {
          _id: {
            campaign_id: '$campaign_id',
            campaign_name: '$campaign_name',
            account_id: '$account_id',
            account_name: '$account_name',
            ad_group_id: '$ad_group_id'
          },
          ad_count: { $sum: 1 },
          created_at: { $min: '$created_at' },
          active_count: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          ad_group_status: { $first: '$ad_group_status' }
        }
      },
      // Then group by campaigns
      {
        $group: {
          _id: {
            campaign_id: '$_id.campaign_id',
            campaign_name: '$_id.campaign_name',
            account_id: '$_id.account_id',
            account_name: '$_id.account_name'
          },
          ad_group_count: { $sum: 1 },
          ad_count: { $sum: '$ad_count' },
          created_at: { $min: '$created_at' },
          active_count: { $sum: '$active_count' },
          active_groups_count: {
            $sum: {
              $cond: [
                { $eq: ['$ad_group_status', 'ENABLED'] },
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
          ad_group_count: '$ad_group_count',
          ad_count: '$ad_count',
          active_count: '$active_count',
          active_groups_count: '$active_groups_count',
          created_at: '$created_at',
          status: {
            $cond: [
              {
                $and: [
                  { $gt: ['$active_count', 0] },
                  { $gt: ['$active_groups_count', 0] }
                ]
              },
              'ENABLED',
              'PAUSED'
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
      data: campaigns
    })

  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
