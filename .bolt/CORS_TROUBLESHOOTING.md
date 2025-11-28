# 🔧 CORS & Mixed Content Troubleshooting Guide

## 🚨 Common Errors

### Error 1: "Mixed content: load all resources via HTTPS"

**Cause:** Frontend is HTTPS but backend URL is HTTP

**Solution:**
```bash
# Update .env to use HTTPS backend
VITE_BACKEND_URL=https://your-backend-url.com
```

**Why it happens:**
- Browsers block HTTP requests from HTTPS pages for security
- This is called "Mixed Content" protection

---

### Error 2: "Response was blocked by CORB"

**Cause:** Cross-Origin Read Blocking - CORS headers not properly set

**Solution:**

1. **Check Backend CORS Configuration**
```python
# backend/main.py should have:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **Verify Backend is Running**
```bash
curl http://localhost:8000/health
```

3. **Check Browser Console for Exact Error**
- Open DevTools (F12)
- Look at Network tab
- Check failed requests

---

### Error 3: "Failed to fetch" / "Network error"

**Cause:** Cannot connect to backend server

**Solutions:**

1. **Backend Not Running**
```bash
# Start backend
cd backend
python main.py
```

2. **Wrong Backend URL**
```bash
# Check .env
cat .env | grep VITE_BACKEND_URL

# Should match where backend is running
# Local: http://localhost:8000
# Production: https://your-backend.com
```

3. **Firewall Blocking**
```bash
# Check if port is open
netstat -an | grep 8000

# On Linux, allow port:
sudo ufw allow 8000
```

---

### Error 4: "CORS policy: No 'Access-Control-Allow-Origin'"

**Cause:** Backend CORS not configured or wrong origin

**Solution:**

1. **Check Backend Logs**
```bash
# Look for CORS errors
cd backend
python main.py
# Check terminal output
```

2. **Update CORS Origins** (if needed)
```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Vite dev
        "http://localhost:3000",      # Alternative
        "https://your-frontend.com",  # Production
    ],
    # ... rest of config
)
```

3. **For Development, Use Wildcard**
```python
allow_origins=["*"]  # Allow all origins (dev only!)
```

---

## 🔍 Debugging Steps

### Step 1: Verify Backend is Running

```bash
# Test health endpoint
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","services":{"yt-dlp":true,"ffmpeg":true,"whisper":true}}
```

### Step 2: Check Frontend .env

```bash
# Display current config
cat .env

# Ensure VITE_BACKEND_URL is set correctly
# Development: http://localhost:8000
# Production: https://your-backend.com
```

### Step 3: Test CORS from Browser Console

```javascript
// Open browser console (F12) and run:
fetch('http://localhost:8000/health', {
  mode: 'cors',
  credentials: 'omit'
})
.then(r => r.json())
.then(console.log)
.catch(console.error);

// Should log health status
// If error, read the error message carefully
```

### Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try the failing action
4. Click on failed request
5. Check:
   - **Request URL**: Is it correct?
   - **Status Code**: What HTTP code?
   - **Response**: What error message?
   - **Headers**: Are CORS headers present?

### Step 5: Verify Protocol Match

```bash
# Frontend protocol
echo $FRONTEND_URL
# Should be http://localhost:5173 (dev)
# Or https://your-site.com (prod)

# Backend protocol
echo $VITE_BACKEND_URL
# Should match frontend protocol!
# HTTP frontend = HTTP backend
# HTTPS frontend = HTTPS backend
```

---

## 🌐 Production Deployment

### Requirements for Production:

1. **HTTPS Everywhere**
   - Frontend: HTTPS ✅
   - Backend: HTTPS ✅
   - No HTTP allowed!

2. **Correct CORS Origins**
```python
# backend/main.py - Production config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://clipforge.com",
        "https://www.clipforge.com",
        "https://app.clipforge.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

3. **Environment Variables**
```bash
# Frontend .env.production
VITE_BACKEND_URL=https://api.clipforge.com

# Backend .env
# (CORS origins in code, not env)
```

### Deploy Backend with HTTPS

**Railway (Automatic HTTPS):**
```bash
railway up
# Railway provides HTTPS automatically
# Use: https://your-app.railway.app
```

**Render (Automatic HTTPS):**
```bash
# Connect GitHub, deploy
# Use: https://your-app.onrender.com
```

**Custom Domain:**
```bash
# 1. Deploy backend
# 2. Get SSL certificate (Let's Encrypt)
# 3. Configure reverse proxy (Nginx)
# 4. Point domain to backend
# 5. Use: https://api.yourdomain.com
```

---

## 🛠️ Quick Fixes

### Fix 1: Local Development CORS Issue

```bash
# Make sure both use HTTP
# Frontend: http://localhost:5173
# Backend: http://localhost:8000

# .env file:
VITE_BACKEND_URL=http://localhost:8000
```

### Fix 2: Production Mixed Content

```bash
# Ensure backend uses HTTPS
VITE_BACKEND_URL=https://your-backend.railway.app

# Rebuild frontend
npm run build

# Deploy updated build
```

### Fix 3: Backend Not Accessible

```bash
# Test backend directly
curl -I http://localhost:8000/health

# If connection refused:
# 1. Start backend: python main.py
# 2. Check port: netstat -an | grep 8000
# 3. Check firewall: sudo ufw status
```

### Fix 4: CORS Headers Missing

```bash
# Check if response has CORS headers
curl -i http://localhost:8000/health

# Look for:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: ...

# If missing, check backend CORS config
```

---

## 📋 Checklist

Before asking for help, verify:

- [ ] Backend is running (`curl http://localhost:8000/health`)
- [ ] `VITE_BACKEND_URL` is set in `.env`
- [ ] Protocol matches (both HTTP or both HTTPS)
- [ ] CORS is configured in backend
- [ ] Firewall allows the port
- [ ] No typos in URLs
- [ ] Browser console shows detailed error
- [ ] Network tab shows request details

---

## 🎯 Testing CORS

### Test Script

Create `test-cors.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>CORS Test</title>
</head>
<body>
    <h1>CORS Test</h1>
    <button onclick="testHealth()">Test Health</button>
    <button onclick="testYouTube()">Test YouTube Info</button>
    <pre id="output"></pre>

    <script>
        const BACKEND_URL = 'http://localhost:8000';
        const output = document.getElementById('output');

        async function testHealth() {
            try {
                const response = await fetch(`${BACKEND_URL}/health`, {
                    mode: 'cors',
                    credentials: 'omit'
                });
                const data = await response.json();
                output.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                output.textContent = 'Error: ' + error.message;
            }
        }

        async function testYouTube() {
            try {
                const response = await fetch(`${BACKEND_URL}/api/youtube/info`, {
                    method: 'POST',
                    mode: 'cors',
                    credentials: 'omit',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
                    })
                });
                const data = await response.json();
                output.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                output.textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

Open in browser and test!

---

## 📞 Still Having Issues?

### Collect This Information:

1. **Error Message** (exact text from console)
2. **Browser** (Chrome, Firefox, Safari, etc.)
3. **Frontend URL** (http://localhost:5173 or https://...)
4. **Backend URL** (from .env)
5. **Backend Status** (output of `curl http://localhost:8000/health`)
6. **Network Tab Screenshot** (showing failed request)

### Common Solutions:

| Error | Cause | Fix |
|-------|-------|-----|
| Mixed content | HTTP backend, HTTPS frontend | Use HTTPS for backend |
| CORS blocked | Wrong origin | Update CORS config |
| Failed to fetch | Backend not running | Start backend |
| 404 Not Found | Wrong URL | Check VITE_BACKEND_URL |
| 500 Server Error | Backend crash | Check backend logs |

---

## 🎓 Understanding CORS

**CORS** = Cross-Origin Resource Sharing

**Same Origin:**
```
✅ http://localhost:5173 → http://localhost:8000 (ALLOWED with CORS)
✅ https://app.com → https://api.app.com (ALLOWED with CORS)
```

**Different Origin (needs CORS):**
```
❌ http://localhost:5173 → http://example.com:8000 (BLOCKED without CORS)
❌ https://app.com → http://api.app.com (BLOCKED - Mixed Content)
```

**Mixed Content:**
```
❌ HTTPS site → HTTP resource (ALWAYS BLOCKED)
✅ HTTPS site → HTTPS resource (OK with CORS)
✅ HTTP site → HTTP resource (OK with CORS)
```

---

**Summary:**
- Development: Use HTTP for both
- Production: Use HTTPS for both
- Always configure CORS in backend
- Match protocols (HTTP ↔ HTTP or HTTPS ↔ HTTPS)

✅ **Follow these steps and CORS issues will be resolved!**
