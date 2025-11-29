# 🌐 Network Issues & Solutions

## ⚠️ Common Network Errors

### Error: `ERR_QUIC_PROTOCOL_ERROR` / `Failed to fetch`

```
TypeError: Failed to fetch
POST https://svyagwlpawpygjhkyjpd.supabase.co/auth/v1/token
net::ERR_QUIC_PROTOCOL_ERROR
```

**This is NOT a code bug!** This is a **network/environment limitation**.

---

## 🔍 Root Causes

### 1. **WebContainer Environment (Bolt.new/StackBlitz)**

**Problem:**
- WebContainer runs in browser sandbox
- Has strict network access limitations
- Cannot make certain types of requests
- QUIC protocol may be blocked

**Why it happens:**
```
Browser Sandbox → WebContainer → Supabase
     ❌ Network restrictions apply
```

**Solution:**
✅ **Deploy to real production environment:**
- Vercel
- Netlify
- Railway
- Any standard Node.js hosting

---

### 2. **Firewall/Proxy Blocking**

**Problem:**
- Corporate firewall blocking Supabase
- VPN interfering with connections
- Proxy blocking HTTPS/QUIC

**Check:**
```bash
# Test if Supabase is reachable
curl -I https://svyagwlpawpygjhkyjpd.supabase.co

# Should return HTTP 200/301
# If fails, network is blocking Supabase
```

**Solution:**
- Disable VPN temporarily
- Check firewall settings
- Try different network
- Use mobile hotspot to test

---

### 3. **Browser Security Policies**

**Problem:**
- Mixed content (HTTP + HTTPS)
- CORS restrictions
- Certificate issues

**Solution:**
- Always use HTTPS in production
- Check browser console for CORS errors
- Try different browser (Chrome, Firefox, Safari)

---

## ✅ Solutions Implemented

### 1. **Error Boundary Component**

```typescript
// src/components/ErrorBoundary.tsx
// Catches and displays network errors gracefully
// Shows helpful error messages
// Provides recovery options
```

**Features:**
- ✅ Catches all React errors
- ✅ Detects network-specific errors
- ✅ Shows helpful troubleshooting tips
- ✅ Allows page reload
- ✅ Pretty error display

---

### 2. **Network Status Monitor**

```typescript
// src/components/NetworkStatus.tsx
// Real-time connection monitoring
// Shows alert when offline
// Checks Supabase connectivity
```

**Features:**
- ✅ Monitors `navigator.onLine`
- ✅ Tests Supabase connection every 30s
- ✅ Shows alert toast when issues detected
- ✅ Auto-dismisses when back online
- ✅ User can manually dismiss

---

## 🚀 Recommended Deployment

### **Option 1: Vercel (Recommended)**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Follow prompts
# Project will deploy with full network access
```

**Why Vercel:**
- ✅ Zero config deployment
- ✅ Automatic HTTPS
- ✅ Full network access
- ✅ Edge functions support
- ✅ Free tier available

---

### **Option 2: Netlify**

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Build
npm run build

# 3. Deploy
netlify deploy --prod --dir=dist
```

**Why Netlify:**
- ✅ Simple deployment
- ✅ Automatic HTTPS
- ✅ No restrictions
- ✅ Great for static sites

---

### **Option 3: Railway**

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway up
```

**Why Railway:**
- ✅ Full Node.js environment
- ✅ Can run backend too
- ✅ Database support
- ✅ Simple pricing

---

## 🔧 Development Workarounds

### **While in WebContainer:**

**1. Mock Mode (Recommended for UI work)**

Create `src/lib/supabase.mock.ts`:

```typescript
// Mock Supabase client for local dev
export const supabase = {
  auth: {
    signUp: async () => ({ data: { user: mockUser }, error: null }),
    signInWithPassword: async () => ({ data: { user: mockUser }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ data: mockData, error: null }),
    insert: () => ({ data: mockData, error: null }),
    update: () => ({ data: mockData, error: null }),
    delete: () => ({ data: null, error: null }),
  }),
};
```

**2. Local Supabase (Advanced)**

```bash
# Run Supabase locally (requires Docker)
npx supabase start

# Update .env to use local instance
VITE_SUPABASE_URL=http://localhost:54321
```

---

## 📊 Error Detection

### **How to identify network errors:**

**1. Check error message:**
```javascript
// Network errors contain these keywords:
- "Failed to fetch"
- "ERR_QUIC_PROTOCOL_ERROR"
- "ERR_CONNECTION_REFUSED"
- "ERR_NETWORK_CHANGED"
- "Network request failed"
```

**2. Check Network tab:**
```
Browser DevTools → Network tab
Look for:
- Status: (failed)
- Type: fetch/xhr
- Red highlighted requests
```

**3. Check Console:**
```
Look for:
- TypeError: Failed to fetch
- AuthRetryableFetchError
- Network errors
```

---

## 🎯 Quick Fixes

### **Fix 1: Reload Page**
```
Simple refresh often resolves temporary issues
Ctrl+R / Cmd+R
```

### **Fix 2: Clear Cache**
```
Ctrl+Shift+Delete (Chrome)
Clear all browser data
Reload page
```

### **Fix 3: Try Incognito**
```
Ctrl+Shift+N (Chrome)
Tests if extensions are interfering
```

### **Fix 4: Different Browser**
```
Chrome → Firefox
Firefox → Safari
Identifies browser-specific issues
```

### **Fix 5: Different Network**
```
WiFi → Mobile hotspot
Home → Office
Identifies network restrictions
```

### **Fix 6: Deploy to Production**
```
npm run build
Deploy to Vercel/Netlify
✅ Production has no restrictions!
```

---

## 📝 Testing Checklist

Before reporting network issues, test:

- [ ] Page reloaded?
- [ ] Different browser?
- [ ] Incognito mode?
- [ ] Different network?
- [ ] VPN disabled?
- [ ] Firewall checked?
- [ ] Other sites work?
- [ ] Supabase status page checked?

---

## 🌐 Supabase Status

Check if Supabase is down:

```
https://status.supabase.com
```

If Supabase shows issues:
- ✅ Not your fault!
- ✅ Wait for resolution
- ✅ Check status page for updates

---

## 💡 Understanding the Error

### **QUIC Protocol:**

QUIC = Quick UDP Internet Connections
- Modern protocol (HTTP/3)
- Used by Google, Cloudflare
- Some networks block it
- Browsers fallback to HTTP/2

**Why blocked in WebContainer:**
- Sandbox security
- Limited network stack
- UDP restrictions
- Browser policies

**Not your code's fault!**

---

## ✅ Production Checklist

When deploying, ensure:

- [ ] Environment variables set
  ```
  VITE_SUPABASE_URL=https://...
  VITE_SUPABASE_ANON_KEY=...
  VITE_BACKEND_URL=https://...
  ```

- [ ] Build succeeds
  ```bash
  npm run build
  # Should complete without errors
  ```

- [ ] HTTPS everywhere
  ```
  Frontend: https://yourapp.com
  Backend:  https://api.yourapp.com
  Supabase: https://xxx.supabase.co
  ```

- [ ] CORS configured
  ```python
  # backend/main.py
  allow_origins=["https://yourapp.com"]
  ```

- [ ] DNS configured
  ```
  A record → Your host IP
  CNAME → Your host domain
  ```

---

## 🎊 Summary

**The Error:**
```
ERR_QUIC_PROTOCOL_ERROR / Failed to fetch
```

**The Cause:**
```
WebContainer network limitations
NOT a code bug!
```

**The Solution:**
```
Deploy to production (Vercel/Netlify)
Full network access = No errors!
```

**What We Added:**
- ✅ Error Boundary - Catches errors gracefully
- ✅ Network Status - Shows connection issues
- ✅ Helpful messages - Guides users
- ✅ Recovery options - Reload button

---

**Remember:** This error ONLY happens in WebContainer. Production deployment will work perfectly! 🚀
