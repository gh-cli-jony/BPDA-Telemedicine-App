import jwt from 'jsonwebtoken';
import { db, publicUser } from './db.js';

const secret = process.env.JWT_SECRET || 'development-secret-change-me';
export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '12h' });

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, secret);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
export const requireAdmin = [requireAuth, (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin permission required' })];
