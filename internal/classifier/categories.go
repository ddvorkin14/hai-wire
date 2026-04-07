package classifier

type Category struct {
	Key         string
	Name        string
	Description string
}

var AllCategories = []Category{
	{Key: "trust_safety", Name: "Trust & Safety / Suspicious Account Review", Description: "Fellows flagged suspicious, follow-on review, KYC marked for review, accounts blocked despite verification"},
	{Key: "pay_disputes", Name: "Pay Disputes", Description: "Fellows disputing pay amounts, requesting approval for disputes, hours not matching"},
	{Key: "verification_swaps", Name: "Verification / Account Swaps", Description: "Deprecate one account, reactivate another (typically EDU vs non-EDU email)"},
	{Key: "slack_access", Name: "Slack Access & Invitations", Description: "Fellows not receiving Slack invites, can't join channels, need resends"},
	{Key: "duplicate_accounts", Name: "Duplicate Account Management", Description: "Duplicate accounts, deprecated accounts needing reactivation, account merges"},
	{Key: "verified_but_blocked", Name: "Account Verified But Still Blocked", Description: "Under review screen persists after T&S verification, KYC glitches"},
	{Key: "pay_rate_corrections", Name: "Pay Rate Corrections", Description: "Wrong rate applied (e.g., bachelors rate for masters fellow, coding rate wrong)"},
	{Key: "project_reallocation", Name: "Project Re-allocation", Description: "Fellow needs to be moved to correct account/project after duplicate resolution or ban lift"},
	{Key: "google_access", Name: "Google Docs / Groups Access", Description: "Can't access Google docs/groups, need invite sent or resent"},
	{Key: "project_not_visible", Name: "Project Not Visible on Dashboard", Description: "Project missing, greyed out, or not showing after allocation"},
	{Key: "onboarding_blocker", Name: "Onboarding Blockers", Description: "Stuck on loading screen, profile setup frozen, can't proceed through signup/setup flows"},
	{Key: "incentive_disputes", Name: "Incentive Disputes", Description: "Missing incentive bonuses, amounts questioned (Chard, Horizon, etc.)"},
	{Key: "geographic_restrictions", Name: "Geographic / Access Restrictions", Description: "Geofencing blocks, non-US access, travel-related restrictions"},
	{Key: "platform_bugs", Name: "Platform Bugs", Description: "Start task button fails, UI scroll issues, broken links"},
	{Key: "ban_appeals", Name: "Ban Appeals & Conflicting Comms", Description: "Ban lifted then re-applied, appeal process unclear"},
	{Key: "account_deletion", Name: "Account Deletion Requests", Description: "Process unclear, tickets bouncing between L1/L2/T&S"},
	{Key: "fraud_scam", Name: "Fraud / Scam / Stolen Account Reports", Description: "Hacked accounts, false identity, phishing DMs"},
	{Key: "feather_access", Name: "Feather Access", Description: "Fellows needing Feather platform access"},
	{Key: "tax_forms", Name: "Tax Form Issues", Description: "1099 vs 1042-S confusion, W9 upload failures, third-party emails"},
	{Key: "assessment_issues", Name: "Assessment Issues", Description: "Errors during assessment, retake requests, wrongful offboarding"},
	{Key: "playbook_access", Name: "Playbook Access", Description: "Can't open project playbook during assessment"},
	{Key: "tasking_issues", Name: "Tasking Issues", Description: "No tasks available, wrong domain tasks, can't start"},
	{Key: "onboarding_emails", Name: "Onboarding Emails / Links Broken", Description: "Domain confirmation not received, invitation links expired"},
	{Key: "project_lead_delays", Name: "Project Lead Approval Delays", Description: "Waiting weeks for approval, empty onboarding sessions"},
	{Key: "work_letters", Name: "Work / Offer Letters", Description: "Fellows requesting employment verification documents"},
	{Key: "hour_adjustments", Name: "Hour Adjustments", Description: "Accidental time entries needing correction"},
	{Key: "git_access", Name: "Git / GitHub Access", Description: "GIT_APPLY_FAILED, GitHub permissions (Helix-specific)"},
}
