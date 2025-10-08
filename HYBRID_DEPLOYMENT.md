# Hybrid Cloudflare + Render Deployment

Your site is now deployed in a hybrid setup:
- **Frontend**: Cloudflare Pages (fast, global CDN)
- **Backend**: Render (Node.js with full compatibility)

## Current Setup

✅ **Frontend URL**: https://c4109d10.minimarket.pages.dev
✅ **Backend URL**: https://minimarket-f1r5.onrender.com
✅ **CORS Configured**: Backend allows requests from Pages

## How It Works

```
User → Cloudflare Pages (HTML/CSS/JS) → Render API (Node.js)
```

### What's Protected by Cloudflare?

✅ **Frontend**: DDoS protection, bot filtering, global CDN
✅ **Turnstile CAPTCHA**: Works on signup/login pages
❌ **API Endpoints**: NOT protected (requests go directly to Render)

### What's NOT Protected?

- Bots can bypass Cloudflare and scrape your API directly at the Render URL
- Rate limiting happens on Render, not Cloudflare
- No Cloudflare WAF for API requests

## Testing with Firecrawl

With the current setup:
- ✅ Firecrawl can scrape static pages (blocked by Cloudflare if configured)
- ✅ Turnstile CAPTCHA will challenge bots on auth pages
- ❌ Firecrawl can bypass and scrape API directly: `https://minimarket-f1r5.onrender.com/api/products`

## Next Steps: Full Cloudflare Protection

To get **full Cloudflare protection** for your API:

### Option 1: Use Cloudflare Proxy Worker (Recommended)

This routes ALL traffic through Cloudflare:

1. **Add a custom domain** (e.g., `minimarket.com`) to Cloudflare
2. **Deploy the proxy worker**:
   ```bash
   cd proxy-worker
   wrangler deploy
   ```
3. **Update wrangler.toml** with your custom domain routes
4. **Result**: All API requests go through Cloudflare first

```
User → Cloudflare Pages → Cloudflare Worker (proxy) → Render API
                ↑
         Full protection here!
```

### Option 2: Use Cloudflare as DNS + Proxy

1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. Add it to Cloudflare DNS
3. Create DNS records:
   - `A` record: `@` → Render IP (proxied through Cloudflare)
   - `CNAME` record: `www` → Render URL (proxied)
4. Enable Cloudflare features:
   - Bot Fight Mode
   - Rate Limiting
   - WAF rules

### Option 3: Move Everything to Cloudflare Workers

Requires major refactoring (as we discussed earlier).

## Current Deployment URLs

### Frontend (Cloudflare Pages)
- **Production**: https://c4109d10.minimarket.pages.dev
- **Dashboard**: https://dash.cloudflare.com → Pages → minimarket

### Backend (Render)
- **Production**: https://minimarket-f1r5.onrender.com
- **Dashboard**: https://dashboard.render.com

## Updating Your Site

### Update Frontend
```bash
wrangler pages deploy front-end --project-name=minimarket --commit-dirty=true
```

### Update Backend
```bash
git add .
git commit -m "Update backend"
git push
# Render auto-deploys from GitHub
```

## Monitoring

### Frontend (Cloudflare)
- View analytics: https://dash.cloudflare.com → Pages → minimarket → Analytics
- Check logs: `wrangler pages deployment list --project-name=minimarket`

### Backend (Render)
- View logs in Render Dashboard
- Monitor performance and uptime

## Security Considerations

### Current Protection Level: ⚠️ Medium

**What's Protected:**
- ✅ Frontend DDoS attacks
- ✅ Static file requests
- ✅ Turnstile on auth endpoints

**What's Vulnerable:**
- ❌ Direct API access (bypass Cloudflare)
- ❌ No WAF for API endpoints
- ❌ Rate limiting only on Render

### Recommended Security Enhancements

1. **Rate Limiting**: Already configured in your Express app (`authLimiter`)
2. **API Authentication**: Already using JWT tokens
3. **Input Validation**: Already using `express-validator`
4. **CSRF Protection**: Already using `csurf`
5. **Add Custom Domain + Proxy**: Upgrade to full Cloudflare protection

## Cost Breakdown

### Current Costs

**Cloudflare Pages**
- Free tier: Unlimited requests, 500 builds/month
- Cost: $0/month

**Render**
- Free tier: 750 hours/month (sleeps after 15 min inactivity)
- Or Paid: $7/month for always-on

**Total**: $0-7/month

### With Custom Domain + Full Protection

- Domain: ~$10-15/year
- Cloudflare: Free (or $20/month for Pro with more features)
- Render: Same as above

**Total**: ~$1-8/month (domain + hosting)

## Troubleshooting

### Issue: API requests fail with CORS error

**Solution**: Check that Render deployed your latest changes
```bash
curl -I https://minimarket-f1r5.onrender.com/api/products
# Should return: Access-Control-Allow-Origin header
```

### Issue: Frontend shows old version

**Solution**: Clear Cloudflare cache
```bash
wrangler pages deployment list --project-name=minimarket
# Redeploy if needed
```

### Issue: Backend is slow to respond

**Cause**: Render free tier sleeps after inactivity
**Solutions**:
1. Upgrade to paid plan ($7/month)
2. Use a cron job to ping your API every 10 minutes
3. Accept the cold start delay (~30 seconds)

## Need Full Cloudflare Protection?

If you want to set up the proxy worker for full protection, let me know! I can help you:
1. Set up a custom domain
2. Configure DNS
3. Deploy the proxy worker
4. Test with Firecrawl to verify bot protection

This will ensure ALL requests (frontend + API) go through Cloudflare's protection.
