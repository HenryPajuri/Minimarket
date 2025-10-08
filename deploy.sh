#!/bin/bash

# Minimarket Cloudflare Deployment Script

set -e

echo "🚀 Deploying Minimarket to Cloudflare..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Deploy Worker (Backend API)
echo ""
echo "📦 Deploying Worker (Backend API)..."
cd server
npx wrangler deploy
WORKER_URL=$(npx wrangler deployments list --limit 1 | grep -oP 'https://[^ ]+' | head -1)
echo "✅ Worker deployed at: $WORKER_URL"
cd ..

# Deploy Pages (Frontend)
echo ""
echo "📦 Deploying Pages (Frontend)..."
npx wrangler pages deploy front-end --project-name=minimarket-frontend
echo "✅ Frontend deployed to Cloudflare Pages"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up secrets if not already done:"
echo "   cd server"
echo "   wrangler secret put MONGO_URI"
echo "   wrangler secret put JWT_SECRET"
echo "   wrangler secret put TURNSTILE_SECRET"
echo ""
echo "2. Create R2 bucket named 'minimarket-uploads' in Cloudflare Dashboard"
echo ""
echo "3. Set up custom domain and routing (see CLOUDFLARE_DEPLOYMENT.md)"
echo ""
echo "4. Test your deployment and enjoy! 🎊"
