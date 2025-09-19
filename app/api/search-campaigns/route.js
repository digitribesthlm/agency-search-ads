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

    // Get campaigns for the user's account with proper status logic
    const campaigns = await db.collection('search_ads').aggregate([
      {
        $match: {
          account_id: session.user.accountId,
          status: { $ne: 'REMOVED' }
        }
      },
      {
        $group: {
          _id: {
            campaign_id: '$campaign_id',
            campaign_name: '$campaign_name',
            account_id: '$account_id',
            account_name: '$account_name'
          },
          ad_group_count: { $addToSet: '$ad_group_id' },
          ad_count: { $sum: 1 },
          created_at: { $min: '$created_at' },
          active_count: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          paused_count: { $sum: { $cond: [{ $eq: ['$status', 'PAUSED'] }, 1, 0] } },
          active_ad_group_ids: {
            $addToSet: {
              $cond: [
                { $eq: ['$ad_group_status', 'ACTIVE'] },
                '$ad_group_id',
                null
              ]
            }
          }
        }
      },
      {
        $addFields: {
          active_groups_count: {
            $size: {
              $setDifference: ['$active_ad_group_ids', [null]]
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
          ad_group_count: { $size: '$ad_group_count' },
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
              'ACTIVE',
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
