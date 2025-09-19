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

    // ✅ ENHANCED: Get campaigns with BUDGET AUTOMATION fields from MongoDB
    const campaigns = await db.collection('search_ads').aggregate([
      {
        $match: {
          account_id: session.user.accountId,
          status: { $ne: 'REMOVED' }
        }
      },
      // First group by ad groups to get their status and counts
      {
        $group: {
          _id: {
            campaign_id: '$campaign_id',
            campaign_name: '$campaign_name',
            account_id: '$account_id',
            account_name: '$account_name',
            campaign_status: '$campaign_status',
            // ✅ NEW: Budget automation fields from MongoDB
            budget_automation_flag: '$budget_automation_flag',
            effective_status: '$effective_status',
            is_budget_managed: '$is_budget_managed',
            ad_group_id: '$ad_group_id'
          },
          ad_count: { $sum: 1 },
          created_at: { $min: '$created_at' },
          active_count: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          paused_count: { $sum: { $cond: [{ $eq: ['$status', 'PAUSED'] }, 1, 0] } },
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
            account_name: '$_id.account_name',
            campaign_status: '$_id.campaign_status',
            // ✅ NEW: Budget automation fields
            budget_automation_flag: '$_id.budget_automation_flag',
            effective_status: '$_id.effective_status',
            is_budget_managed: '$_id.is_budget_managed'
          },
          ad_group_count: { $sum: 1 },
          ad_count: { $sum: '$ad_count' },
          created_at: { $min: '$created_at' },
          total_active_count: { $sum: '$active_count' },
          total_paused_count: { $sum: '$paused_count' },
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
          
          // ✅ ENHANCED: Multiple status fields for complete transparency
          // 1. Google Ads Status - Raw status from Google Ads
          google_ads_status: '$_id.campaign_status',
          
          // 2. Budget Automation Flag - Detection from Apps Script
          budget_automation_flag: '$_id.budget_automation_flag',
          
          // 3. Effective Status - Pre-calculated in Python import
          effective_status_calculated: '$_id.effective_status',
          
          // 4. Is Budget Managed - Boolean flag
          is_budget_managed: '$_id.is_budget_managed',
          
          // 5. Campaign Status - Keep for backward compatibility
          campaign_status: '$_id.campaign_status',
          
          ad_group_count: '$ad_group_count',
          ad_count: '$ad_count',
          active_count: '$total_active_count',
          paused_count: '$total_paused_count',
          active_groups_count: '$active_groups_count',
          paused_groups_count: '$paused_groups_count',
          created_at: '$created_at',
          
          // ✅ ENHANCED: Dashboard Status Logic using budget automation data
          status: {
            $switch: {
              branches: [
                // Use pre-calculated effective status if available
                {
                  case: { $eq: ['$_id.effective_status', 'ENABLED'] },
                  then: 'ENABLED'
                },
                {
                  case: { $eq: ['$_id.effective_status', 'BUDGET_MANAGED_ACTIVE'] },
                  then: 'BUDGET_ACTIVE'
                },
                {
                  case: { $eq: ['$_id.effective_status', 'BUDGET_MANAGED_PAUSED'] },
                  then: 'BUDGET_PAUSED'
                },
                {
                  case: { $eq: ['$_id.effective_status', 'BUDGET_MANAGED'] },
                  then: 'BUDGET_MANAGED'
                },
                {
                  case: { $eq: ['$_id.effective_status', 'PAUSED'] },
                  then: 'PAUSED'
                }
              ],
              default: {
                // Fallback to original logic if effective_status is missing
                $cond: [
                  // Condition 1: Campaign itself is PAUSED in Google Ads
                  { $eq: ['$_id.campaign_status', 'PAUSED'] },
                  'PAUSED',
                  // Condition 2: Campaign is ENABLED but all ad groups are PAUSED
                  {
                    $cond: [
                      { $eq: ['$active_groups_count', 0] },
                      'PAUSED',
                      // Condition 3: Campaign is ENABLED, has active groups, but all ads are PAUSED
                      {
                        $cond: [
                          { $eq: ['$total_active_count', 0] },
                          'PAUSED',
                          // Campaign is truly running: ENABLED + active groups + active ads
                          'ENABLED'
                        ]
                      }
                    ]
                  }
                ]
              }
            }
          },
          
          // ✅ NEW: Budget Status Badge for UI
          budget_status_badge: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$_id.budget_automation_flag', 'BUDGET_AUTOMATION_ACTIVE'] },
                  then: 'BUDGET_ACTIVE'
                },
                {
                  case: { $eq: ['$_id.budget_automation_flag', 'LIKELY_BUDGET_PAUSED'] },
                  then: 'BUDGET_PAUSED'
                },
                {
                  case: { $eq: ['$_id.budget_automation_flag', 'BUDGET_MANAGED'] },
                  then: 'BUDGET_MANAGED'
                },
                {
                  case: { $eq: ['$_id.budget_automation_flag', 'NORMAL'] },
                  then: 'NORMAL'
                }
              ],
              default: 'UNKNOWN'
            }
          }
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]).toArray()

    // ✅ NEW: Calculate budget automation summary
    const budgetSummary = campaigns.reduce((acc, campaign) => {
      const flag = campaign.budget_automation_flag || 'UNKNOWN';
      const effectiveStatus = campaign.effective_status_calculated || 'UNKNOWN';
      
      acc.automation_flags[flag] = (acc.automation_flags[flag] || 0) + 1;
      acc.effective_statuses[effectiveStatus] = (acc.effective_statuses[effectiveStatus] || 0) + 1;
      
      if (campaign.is_budget_managed) {
        acc.budget_managed_count++;
      }
      
      return acc;
    }, {
      automation_flags: {},
      effective_statuses: {},
      budget_managed_count: 0
    });

    return NextResponse.json({
      success: true,
      data: campaigns,
      // ✅ NEW: Enhanced metadata with budget automation insights
      metadata: {
        total_campaigns: campaigns.length,
        budget_automation_summary: budgetSummary,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
