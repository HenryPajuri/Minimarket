import jwt from 'jsonwebtoken';

export const issueToken = (user) =>
  jwt.sign(
    { sub: user.id },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '2h',
      issuer:    process.env.JWT_ISS,
      audience:  process.env.JWT_AUD,
    }
  );

// protect routes
export const requireAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ msg: 'Unauthenticated' });

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISS,
      audience: process.env.JWT_AUD,
    });
    next();
  } catch {
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
};
