import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Import models (these will work with Mongoose)
import User from './models/User.js';
import Product from './models/Product.js';
import Message from './models/Message.js';

const app = new Hono();

// MongoDB connection helper
let isConnected = false;
async function connectDB(mongoUri) {
  if (isConnected) return;
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  isConnected = true;
  console.log('✓ MongoDB connected');
}

// CORS middleware
app.use('*', cors({
  origin: (origin) => origin, // Allow all origins, or specify your Cloudflare Pages URL
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// JWT helper functions
function issueToken(user, jwtSecret, jwtIss, jwtAud) {
  return jwt.sign(
    { sub: user.id },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '2h',
      issuer: jwtIss,
      audience: jwtAud,
    }
  );
}

// Auth middleware
function requireAuth(jwtSecret, jwtIss, jwtAud) {
  return async (c, next) => {
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ msg: 'Unauthenticated' }, 401);
    }

    try {
      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        issuer: jwtIss,
        audience: jwtAud,
      });
      c.set('auth', decoded);
      await next();
    } catch (err) {
      return c.json({ msg: 'Invalid or expired token' }, 401);
    }
  };
}

// Turnstile verification
async function verifyCaptcha(token, ip, secret) {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  return data.success === true;
}

// Main handler
app.get('/', (c) => c.redirect('/html/index.html'));

// CSRF token endpoint
app.get('/api/csrf', (c) => {
  // For Cloudflare Workers, you might want to use a different CSRF approach
  // This is a simplified version
  const csrfToken = crypto.randomUUID();
  return c.json({ csrfToken });
});

// Auth routes
app.post('/api/auth/signup', async (c) => {
  const env = c.env;
  await connectDB(env.MONGO_URI);

  const body = await c.req.json();
  const { name, email, password, captchaToken } = body;

  // Validation
  const errors = [];
  if (!name || name.trim().length < 2) errors.push({ msg: 'Name must be at least 2 characters' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ msg: 'Please enter a valid email' });
  if (!password || password.length < 8) errors.push({ msg: 'Password must be at least 8 characters' });

  // Verify captcha
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '';
  const captchaValid = await verifyCaptcha(captchaToken, ip, env.TURNSTILE_SECRET);
  if (!captchaValid) errors.push({ msg: 'CAPTCHA failed' });

  if (errors.length) return c.json({ errors }, 400);

  try {
    const user = await User.signup({ name, email, password });
    const token = issueToken(user, env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);

    setCookie(c, 'token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
      path: '/',
      maxAge: 7200,
    });

    return c.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    return c.json({ msg: err.message }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  const env = c.env;
  await connectDB(env.MONGO_URI);

  const body = await c.req.json();
  const { email, password } = body;

  const errors = [];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ msg: 'Please enter a valid email' });
  if (!password) errors.push({ msg: 'Password is required' });

  if (errors.length) return c.json({ errors }, 400);

  const user = await User.findOne({ email });
  if (!user || !(await user.verifyPassword(password))) {
    return c.json({ msg: 'Wrong email or password' }, 401);
  }

  const token = issueToken(user, env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);

  setCookie(c, 'token', token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: true,
    path: '/',
    maxAge: 7200,
  });

  return c.json({ user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.json({ msg: 'Logged out' });
});

app.get('/api/auth/me', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const user = await User.findById(auth.sub);
  if (!user) return c.json({ msg: 'User not found' }, 401);

  return c.json({ id: user.id, name: user.name, email: user.email });
});

// Products routes
app.get('/api/products', async (c) => {
  const env = c.env;
  await connectDB(env.MONGO_URI);

  const items = await Product.find().sort('-createdAt').limit(100);
  return c.json(items);
});

app.get('/api/products/my-items', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const items = await Product.find({ owner: auth.sub })
    .sort('-createdAt')
    .populate('owner', 'name');
  return c.json(items);
});

app.get('/api/products/:id', async (c) => {
  const env = c.env;
  await connectDB(env.MONGO_URI);

  const item = await Product.findById(c.req.param('id')).populate('owner', 'name');
  if (!item) return c.json({ msg: 'Item not found' }, 404);
  return c.json(item);
});

app.post('/api/products', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const formData = await c.req.formData();

  const name = formData.get('name');
  const price = parseFloat(formData.get('price'));
  const category = formData.get('category');
  const description = formData.get('description') || '';
  const files = formData.getAll('images');

  // Validation
  const errors = [];
  if (!name) errors.push({ msg: 'Name required' });
  if (isNaN(price) || price < 0) errors.push({ msg: 'Price ≥ 0' });
  if (!['clothing', 'shoes', 'accessories'].includes(category)) errors.push({ msg: 'Bad category' });
  if (description.length > 800) errors.push({ msg: 'Description too long' });

  if (errors.length) return c.json({ errors }, 400);

  // Upload files to R2
  const imgUrls = [];
  for (const file of files.slice(0, 3)) {
    if (file instanceof File && file.size > 0) {
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      await env.UPLOADS.put(filename, file.stream());
      imgUrls.push(`/uploads/${filename}`);
    }
  }

  const product = await Product.create({
    name,
    price,
    category,
    description,
    images: imgUrls,
    image: imgUrls[0] || '',
    owner: auth.sub,
  });

  return c.json(product, 201);
});

app.delete('/api/products/:id', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const product = await Product.findById(c.req.param('id'));

  if (!product) return c.json({ msg: 'Product not found' }, 404);
  if (product.owner.toString() !== auth.sub) {
    return c.json({ msg: 'Not authorized to delete this product' }, 403);
  }

  // Delete images from R2
  if (product.images && product.images.length > 0) {
    for (const imagePath of product.images) {
      const filename = imagePath.replace('/uploads/', '');
      await env.UPLOADS.delete(filename);
    }
  }

  await Product.findByIdAndDelete(c.req.param('id'));
  return c.json({ msg: 'Product deleted successfully' });
});

// Messages routes
app.get('/api/messages', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const conversations = await Message.getConversations(auth.sub);

  const formattedConversations = conversations.map(conv => {
    const currentUserId = auth.sub;
    const otherUser = conv.user1[0]?._id.toString() === currentUserId
      ? conv.user2[0]
      : conv.user1[0];

    return {
      otherUser: {
        id: otherUser._id,
        name: otherUser.name,
        email: otherUser.email
      },
      lastMessage: {
        content: conv.lastMessage.content,
        createdAt: conv.lastMessage.createdAt,
        sender: conv.lastMessage.sender,
        read: conv.lastMessage.read
      },
      unreadCount: conv.unreadCount,
      product: conv.productInfo[0] ? {
        id: conv.productInfo[0]._id,
        name: conv.productInfo[0].name,
        image: conv.productInfo[0].image
      } : null
    };
  });

  return c.json(formattedConversations);
});

app.get('/api/messages/:userId', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const userId = c.req.param('userId');

  const otherUser = await User.findById(userId);
  if (!otherUser) return c.json({ msg: 'User not found' }, 404);

  const messages = await Message.find({
    $or: [
      { sender: auth.sub, recipient: userId },
      { sender: userId, recipient: auth.sub }
    ]
  })
  .populate('sender', 'name')
  .populate('recipient', 'name')
  .populate('product', 'name image')
  .sort({ createdAt: 1 });

  await Message.updateMany(
    { sender: userId, recipient: auth.sub, read: false },
    { read: true }
  );

  return c.json({
    otherUser: { id: otherUser._id, name: otherUser.name },
    messages
  });
});

app.post('/api/messages', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const body = await c.req.json();
  const { recipient, content, productId } = body;

  // Validation
  const errors = [];
  if (!recipient || !/^[0-9a-fA-F]{24}$/.test(recipient)) errors.push({ msg: 'Invalid recipient ID' });
  if (!content || content.trim().length < 1 || content.length > 1000) {
    errors.push({ msg: 'Message must be 1-1000 characters' });
  }
  if (productId && !/^[0-9a-fA-F]{24}$/.test(productId)) errors.push({ msg: 'Invalid product ID' });

  if (errors.length) return c.json({ errors }, 400);

  const recipientUser = await User.findById(recipient);
  if (!recipientUser) return c.json({ msg: 'Recipient not found' }, 404);

  if (productId) {
    const product = await Product.findById(productId);
    if (!product) return c.json({ msg: 'Product not found' }, 404);
  }

  const message = await Message.create({
    sender: auth.sub,
    recipient,
    content,
    product: productId || undefined
  });

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name')
    .populate('recipient', 'name')
    .populate('product', 'name image');

  return c.json(populatedMessage, 201);
});

app.get('/api/messages/unread/count', async (c) => {
  const env = c.env;
  const authMiddleware = requireAuth(env.JWT_SECRET, env.JWT_ISS, env.JWT_AUD);
  await authMiddleware(c, async () => {});

  await connectDB(env.MONGO_URI);

  const auth = c.get('auth');
  const count = await Message.countDocuments({
    recipient: auth.sub,
    read: false
  });

  return c.json({ count });
});

// Serve uploaded files from R2
app.get('/uploads/:filename', async (c) => {
  const env = c.env;
  const filename = c.req.param('filename');

  const object = await env.UPLOADS.get(filename);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
});

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ msg: 'Server error', error: err.message }, 500);
});

export default app;
