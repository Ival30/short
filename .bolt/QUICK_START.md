# 🚀 Quick Start Guide - ClipForge Admin & Groq AI

## ⚡ TL;DR - Get Started in 5 Minutes

### 1. Get Groq API Key (FREE)
```bash
# Visit https://console.groq.com/keys
# Sign up and copy your API key
```

### 2. Add to Supabase
```bash
# Go to Supabase Dashboard
# Edge Functions → Settings → Add Secret
# Name: GROQ_API_KEY
# Value: your_key_here
```

### 3. Create Super Admin
```sql
-- Option A: Sign up via UI first, then run:
SELECT promote_to_super_admin('your@email.com');

-- Option B: Already signed up? Just promote:
UPDATE profiles
SET role = 'super_admin', subscription_tier = 'enterprise'
WHERE email = 'your@email.com';
```

### 4. Access Admin Dashboard
```
1. Login to ClipForge
2. Look for "Admin" button in navigation
3. Click to access `/admin`
4. Go to Settings → Configure features and AI
```

### 5. Test AI Features
```
1. Upload a video
2. Click "Transcribe" → Uses Groq Whisper
3. Click "Generate Clips" → Uses Groq Mixtral
4. View AI-suggested clips with viral scores
```

---

## 🎯 Key Features You Can Use Now

### As Super Admin

**Feature Management**
- Toggle features on/off globally
- Enable: YouTube Import, AI Transcription, AI Clips, etc.
- Changes apply immediately to all users

**AI Configuration**
- Provider: Groq (recommended), OpenAI, Anthropic
- Models: Whisper Large v3, Mixtral 8x7B
- Temperature: 0.0-2.0 (default: 0.7)
- Max Tokens: 100-4000 (default: 2000)

**User Management**
```sql
-- Promote user to admin
SELECT promote_to_super_admin('user@example.com');

-- Ban user
SELECT set_user_active_status('user@example.com', false);

-- Unban user
SELECT set_user_active_status('user@example.com', true);

-- Demote admin
SELECT demote_from_admin('admin@example.com');
```

**View Stats**
- Total users, videos, clips
- Storage usage
- Processing jobs
- Real-time dashboard

### As User

**YouTube Import**
```
1. Paste YouTube URL
2. Click "Import"
3. Wait 30-120 seconds
4. Video ready!
```

**AI Transcription** (Pro+ tier)
```
1. Upload video
2. Wait for auto-transcription
3. View word-by-word transcript
4. See timestamps
```

**AI Clip Generation** (Pro+ tier)
```
1. Video must be transcribed first
2. Click "Generate Clips"
3. AI analyzes and suggests 10+ clips
4. Each clip has viral score (0-100)
5. Edit, export, or refine
```

---

## 💡 Common Tasks

### Check Your Usage
```typescript
// Frontend
const { usage, getUserLimit } = useSettings();

console.log(`Videos: ${usage.videos_uploaded}/${getUserLimit('videos_per_month')}`);
console.log(`Clips: ${usage.clips_generated}/${getUserLimit('clips_per_video')}`);
console.log(`AI Credits: ${usage.ai_credits_used}/${getUserLimit('ai_credits_per_month')}`);

// Backend (SQL)
SELECT * FROM get_user_usage_stats('user_id');
```

### Check Feature Access
```typescript
// Frontend
const { canUserAccess, isFeatureEnabled } = useSettings();

if (canUserAccess('ai_transcription')) {
  // Show transcription button
}

// Backend (SQL)
SELECT check_feature_access('user_id', 'ai_transcription');
```

### Enable/Disable Features
```
1. Login as super admin
2. Go to /admin/settings
3. Toggle feature switches
4. Click "Save Changes"
5. Features immediately update for all users
```

### View Audit Logs
```sql
-- See all admin actions
SELECT * FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 50;

-- See actions by specific admin
SELECT * FROM admin_audit_log
WHERE admin_id = 'admin_user_id'
ORDER BY created_at DESC;

-- See actions on specific user
SELECT * FROM admin_audit_log
WHERE target_type = 'profile'
  AND target_id = 'target_user_id'
ORDER BY created_at DESC;
```

---

## �� Using Feature Gates

### In Your Components
```tsx
import { FeatureGate, LimitGate } from './components/FeatureGate';

// Protect premium features
<FeatureGate feature="ai_transcription">
  <button onClick={transcribe}>Transcribe</button>
</FeatureGate>

// Enforce usage limits
<LimitGate limitType="videos_uploaded">
  <button onClick={upload}>Upload Video</button>
</LimitGate>

// Custom fallback
<FeatureGate
  feature="batch_processing"
  fallback={<p>Upgrade to Business for batch processing</p>}
>
  <BatchUploader />
</FeatureGate>
```

---

## 🔐 Security Best Practices

### 1. Protect API Keys
```bash
# ✅ GOOD - Environment variables
GROQ_API_KEY=your_key

# ❌ BAD - Hardcoded
const apiKey = "gsk_abc123..."
```

### 2. Use RLS Policies
```sql
-- All tables have RLS enabled
-- Users can only access their own data
-- Admins have broader access
-- Super admins have full access
```

### 3. Validate on Backend
```typescript
// Always check permissions in Edge Functions
const canAccess = await supabase.rpc('check_feature_access', {
  p_user_id: userId,
  p_feature: 'ai_transcription'
});

if (!canAccess) {
  return new Response('Unauthorized', { status: 403 });
}
```

### 4. Log Admin Actions
```sql
-- Automatically logged
SELECT log_admin_action(
  auth.uid(),
  'update_user_role',
  'profile',
  target_user_id,
  '{"old_role": "user"}',
  '{"new_role": "admin"}'
);
```

---

## 💰 Pricing Configuration

### Update Tier Prices
```sql
-- In system_settings table
UPDATE system_settings
SET value = '{
  "free": 0,
  "pro": 29,
  "business": 99,
  "enterprise": 299
}'::jsonb
WHERE key = 'pricing';
```

### Update Tier Limits
```sql
-- In system_settings table
UPDATE system_settings
SET value = '{
  "free": {
    "videos_per_month": 5,
    "clips_per_video": 20,
    ...
  },
  ...
}'::jsonb
WHERE key = 'limits';
```

Or use the UI: `/admin/settings` (coming soon for limits)

---

## 🐛 Troubleshooting

### Admin Menu Not Showing
```sql
-- Check your role
SELECT role FROM profiles WHERE id = auth.uid();

-- Should be 'admin' or 'super_admin'
-- If not, promote yourself:
SELECT promote_to_super_admin('your@email.com');
```

### AI Functions Not Working
```bash
# 1. Check Groq API key is set
# Supabase Dashboard → Edge Functions → Settings

# 2. Check function logs
# Supabase Dashboard → Edge Functions → Logs

# 3. Test Groq API key
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

### Feature Gate Not Working
```typescript
// 1. Check if feature is enabled globally
const { isFeatureEnabled } = useSettings();
console.log('Enabled:', isFeatureEnabled('ai_transcription'));

// 2. Check if user has access
const { canUserAccess } = useSettings();
console.log('Can access:', canUserAccess('ai_transcription'));

// 3. Check user tier
const { profile } = useAuth();
console.log('Tier:', profile?.subscription_tier);
```

### Usage Not Tracking
```sql
-- Check if triggers are working
SELECT * FROM usage_tracking
WHERE user_id = auth.uid()
  AND month = date_trunc('month', CURRENT_DATE)::date;

-- Should auto-create on first video upload
-- If missing, manually create:
INSERT INTO usage_tracking (user_id, month)
VALUES (auth.uid(), date_trunc('month', CURRENT_DATE)::date);
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Watch
```sql
-- Daily active users
SELECT DATE(created_at), COUNT(DISTINCT user_id)
FROM admin_audit_log
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC
LIMIT 30;

-- Video upload trends
SELECT DATE(created_at), COUNT(*)
FROM videos
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC
LIMIT 30;

-- AI usage
SELECT
  SUM(ai_credits_used) as total_credits,
  AVG(ai_credits_used) as avg_per_user,
  COUNT(*) as total_users
FROM usage_tracking
WHERE month = date_trunc('month', CURRENT_DATE)::date;

-- Storage by tier
SELECT
  subscription_tier,
  COUNT(*) as users,
  SUM(storage_used) as total_storage,
  AVG(storage_used) as avg_storage
FROM profiles
GROUP BY subscription_tier;
```

---

## 🎯 Tips & Tricks

### 1. Bulk Update Users
```sql
-- Upgrade all free users to pro (for testing)
UPDATE profiles
SET subscription_tier = 'pro'
WHERE subscription_tier = 'free';
```

### 2. Reset Usage (New Month)
```sql
-- Automatically happens, but you can manually reset:
DELETE FROM usage_tracking
WHERE month < date_trunc('month', CURRENT_DATE)::date;
```

### 3. Test Feature Gates Quickly
```typescript
// Temporarily override in dev
const { canUserAccess } = useSettings();
const canAccess = true; // Force enable for testing

if (canAccess) {
  // Feature code
}
```

### 4. Quick Role Check
```tsx
const { isAdmin, isSuperAdmin } = useSettings();

if (isSuperAdmin()) {
  return <SuperAdminDashboard />;
}

if (isAdmin()) {
  return <AdminDashboard />;
}

return <UserDashboard />;
```

---

## 📚 Useful SQL Queries

```sql
-- Find all super admins
SELECT email, full_name FROM profiles WHERE role = 'super_admin';

-- Find users over storage limit
SELECT email, storage_used, storage_limit
FROM profiles
WHERE storage_used > storage_limit;

-- Find most active users
SELECT
  p.email,
  u.videos_uploaded,
  u.clips_generated
FROM profiles p
JOIN usage_tracking u ON p.id = u.user_id
WHERE u.month = date_trunc('month', CURRENT_DATE)::date
ORDER BY u.videos_uploaded DESC
LIMIT 10;

-- Find users about to hit limits
SELECT
  p.email,
  p.subscription_tier,
  u.videos_uploaded,
  (SELECT value -> p.subscription_tier ->> 'videos_per_month'
   FROM system_settings WHERE key = 'limits')::int as limit
FROM profiles p
JOIN usage_tracking u ON p.id = u.user_id
WHERE u.month = date_trunc('month', CURRENT_DATE)::date
  AND u.videos_uploaded >= (
    SELECT (value -> p.subscription_tier ->> 'videos_per_month')::int * 0.8
    FROM system_settings WHERE key = 'limits'
  );
```

---

## ✅ Checklist - Are You Ready?

- [ ] Groq API key added to Supabase
- [ ] Super admin account created
- [ ] Can access `/admin` dashboard
- [ ] Can access `/admin/settings`
- [ ] Feature flags toggle works
- [ ] AI configuration saves
- [ ] Uploaded test video
- [ ] Ran transcription (if enabled)
- [ ] Generated clips (if enabled)
- [ ] Checked usage stats
- [ ] Tested feature gates
- [ ] Reviewed audit logs

---

## 🆘 Need Help?

### Common Questions

**Q: How much does Groq cost?**
A: Groq has generous free tier. Paid is ~$0.10/hour for transcription.

**Q: Can I use OpenAI instead?**
A: Yes! Change provider in `/admin/settings`. Just know it's more expensive.

**Q: How do I add new features?**
A: Add to `features` object in `system_settings`, then create `<FeatureGate>` in UI.

**Q: Can I customize tier limits?**
A: Yes! Update `limits` in `system_settings` table or via UI (coming soon).

**Q: What if I run out of AI credits?**
A: Users see upgrade prompt. Admins can manually increase limits or upgrade their tier.

---

## 🎊 You're All Set!

Your ClipForge instance is now a fully-featured, enterprise-ready video clipping platform with:

✅ AI-powered transcription
✅ Intelligent clip detection
✅ Role-based access control
✅ Feature flag management
✅ Usage tracking and limits
✅ Admin dashboard
✅ Audit logging
✅ Multi-tier subscriptions

**Happy Clipping! 🎬✨**
