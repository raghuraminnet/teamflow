import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'teamflow-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'teamflow-refresh-secret-change-in-production';
export function signAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}
export function signRefreshToken(payload) {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET);
}
