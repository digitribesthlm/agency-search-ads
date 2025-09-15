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

    // Aggregate campaign info and derive status from underlying ads
    const campaignAgg = await db.collection('search_ads').aggregate([
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
            campaign_id: '$campaign_id',
            campaign_name: '$campaign_name',
            account_id: '$account_id',
            account_name: '$account_name'
          },
          earliest_created_at: { $min: '$created_at' },
          active_count: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          paused_count: { $sum: { $cond: [{ $eq: ['$status', 'PAUSED'] }, 1, 0] } }
        }
      },
      {
        $project: {
          campaign_id: '$_id.campaign_id',
          campaign_name: '$_id.campaign_name',
          account_id: '$_id.account_id',
          account_name: '$_id.account_name',
          created_at: '$earliest_created_at',
          // Derive status: ACTIVE if any active ads, else PAUSED if any paused, else ACTIVE by default
          status: {
            $cond: [
              { $gt: ['$active_count', 0] },
              'ACTIVE',
              { $cond: [{ $gt: ['$paused_count', 0] }, 'PAUSED', 'ACTIVE'] }
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

