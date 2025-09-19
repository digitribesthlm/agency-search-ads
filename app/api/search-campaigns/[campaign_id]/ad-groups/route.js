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

    // Get ad groups for the campaign using ad_group_status from DB
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
            ad_group_name: '$ad_group_name'
          },
          ad_count: { $sum: 1 },
          created_at: { $min: '$created_at' },
          ad_group_status: { $first: '$ad_group_status' }
        }
      },
      {
        $project: {
          ad_group_id: '$_id.ad_group_id',
          ad_group_name: '$_id.ad_group_name',
          ad_count: '$ad_count',
          created_at: '$created_at',
          status: '$ad_group_status'
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

