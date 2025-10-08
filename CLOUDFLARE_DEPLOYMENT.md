# Cloudflare Deployment Guide

This guide explains how to deploy your Minimarket application to Cloudflare.

## Architecture

- **Frontend**: Cloudflare Pages (static HTML/CSS/JS)
- **Backend API**: Cloudflare Workers (Hono framework)
- **Database**: MongoDB Atlas (existing)
- **File Storage**: Cloudflare R2 Buckets

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed (`npm install -g wrangler`)
3. MongoDB Atlas database
4. Cloudflare Turnstile site key and secret

## Step 1: Set Up R2 Bucket

1. Log in to Cloudflare Dashboard
2. Go to R2 Object Storage
3. Create a new bucket named `minimarket-uploads`
4. Note the bucket name

## Step 2: Configure Secrets for Workers

Navigate to the `server` directory and set up your secrets:

```bash
cd server

# Set MongoDB connection string
wrangler secret put MONGO_URI

# Set JWT secret
wrangler secret put JWT_SECRET

# Set Turnstile secret
wrangler secret put TURNSTILE_SECRET
```

When prompted, paste your secret values.

## Step 3: Deploy the Worker (Backend API)

From the `server` directory:

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# This will output your Worker URL, e.g.:
# https://minimarket-api.your-subdomain.workers.dev
```

Note the Worker URL - you'll need it for the next step.

## Step 4: Deploy Frontend to Cloudflare Pages

### Option A: Via Cloudflare Dashboard

1. Log in to Cloudflare Dashboard
2. Go to Pages
3. Click "Create a project"
4. Connect your GitHub repository
5. Set build configuration:
   - **Build command**: (leave empty)
   - **Build output directory**: `front-end`
   - **Root directory**: (leave empty or set to `/`)
6. Deploy

### Option B: Via Wrangler CLI

```bash
# From the project root
npx wrangler pages deploy front-end --project-name=minimarket-frontend
```

## Step 5: Configure Custom Domain (Optional)

1. In Cloudflare Pages, go to your project settings
2. Add a custom domain if desired
3. Cloudflare will automatically configure DNS

## Step 6: Connect Frontend to Backend

You have two options:

### Option A: Use a Custom Domain with Path-Based Routing (Recommended)

1. Set up a custom domain for your Pages site (e.g., `minimarket.com`)
2. Add a Worker route in Cloudflare Dashboard:
   - Pattern: `minimarket.com/api/*`
   - Worker: `minimarket-api`
3. Add another route for uploads:
   - Pattern: `minimarket.com/uploads/*`
   - Worker: `minimarket-api`

This way, all `/api/*` and `/uploads/*` requests go to the Worker, and everything else goes to Pages.

### Option B: Use CORS with Separate Domains

If using separate domains:

1. Update the CORS configuration in `server/worker.js`:
   ```javascript
   app.use('*', cors({
     origin: 'https://your-pages-url.pages.dev', // Your actual Pages URL
     credentials: true,
     allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
   }));
   ```

2. Redeploy the Worker

## Step 7: Update Environment Variables

Make sure your `wrangler.toml` has the correct configuration:

```toml
name = "minimarket-api"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
NODE_ENV = "production"
JWT_ISS = "minimarket"
JWT_AUD = "minimarket-users"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "minimarket-uploads"
```

## Testing the Deployment

1. Visit your Cloudflare Pages URL
2. Test user signup/login
3. Test product creation and image uploads
4. Test messaging functionality

## Troubleshooting

### MongoDB Connection Issues

If you get MongoDB connection errors:
- Ensure your MongoDB Atlas cluster allows connections from `0.0.0.0/0` (all IPs)
- Verify your `MONGO_URI` secret is correct
- Check that your MongoDB user has proper permissions

### CORS Errors

If you see CORS errors in the browser console:
- Update the `origin` in the CORS configuration in `worker.js`
- Redeploy the Worker
- Clear your browser cache

### File Upload Issues

If file uploads fail:
- Verify the R2 bucket name matches in `wrangler.toml`
- Check that the R2 bucket exists in your Cloudflare account
- Ensure the Worker has proper bindings

### Worker Not Found

If you get 404 errors for API calls:
- Verify the Worker is deployed: `npx wrangler deployments list`
- Check Worker routes in Cloudflare Dashboard
- Ensure the Worker URL is correct

## Monitoring and Logs

View Worker logs in real-time:

```bash
cd server
npx wrangler tail
```

Or view logs in Cloudflare Dashboard under Workers → your-worker → Logs.

## Cost Estimation

- **Workers**: 100,000 requests/day free, then $0.50/million
- **R2 Storage**: 10 GB storage free, $0.015/GB/month after
- **R2 Operations**: Class A (uploads): $4.50/million, Class B (downloads): $0.36/million
- **Pages**: Unlimited requests, 500 builds/month free

## Additional Notes

- The Worker uses Mongoose to connect to MongoDB, which works but may have cold start delays
- Consider using Cloudflare Durable Objects for real-time features in the future
- For production, set up proper monitoring and error tracking
- Enable Cloudflare Web Analytics for your Pages site

## Rollback

If you need to rollback:

```bash
# List previous deployments
cd server
npx wrangler deployments list

# Rollback to a specific deployment
npx wrangler rollback [deployment-id]
```

## Support

For issues specific to Cloudflare Workers:
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev/)

For MongoDB issues:
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
