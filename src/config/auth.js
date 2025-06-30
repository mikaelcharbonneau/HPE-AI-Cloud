require('dotenv').config();

const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256'
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },
  session: {
    cookieName: 'audit-tool-session',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  validation: {
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    },
    email: {
      maxLength: 254,
      domains: ['hpe.com', 'hp.com'] // Restrict to HPE domains if needed
    }
  }
};

module.exports = authConfig; 