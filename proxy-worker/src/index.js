/**
 * Cloudflare Worker - API Proxy
 * Proxies API requests from Cloudflare Pages to Render backend
 * Provides Cloudflare's bot protection, rate limiting, and caching
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const backendUrl = env.BACKEND_URL || 'https://minimarket-f1r5.onrender.com';

    // Only proxy /api/* and /uploads/* requests
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/uploads/')) {
      return new Response('Not Found', { status: 404 });
    }

    // Construct the backend URL
    const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

    // Clone the request but update the URL
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    // Add Cloudflare headers to track the original IP
    const headers = new Headers(modifiedRequest.headers);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

    // Forward the request to Render backend
    try {
      const response = await fetch(targetUrl, {
        method: modifiedRequest.method,
        headers: headers,
        body: modifiedRequest.body,
      });

      // Clone the response and add CORS headers
      const modifiedResponse = new Response(response.body, response);

      // Add CORS headers for Cloudflare Pages
      modifiedResponse.headers.set('Access-Control-Allow-Origin', 'https://c4109d10.minimarket.pages.dev');
      modifiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: modifiedResponse.headers
        });
      }

      return modifiedResponse;
    } catch (error) {
      return new Response(`Proxy Error: ${error.message}`, {
        status: 502,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }
};
