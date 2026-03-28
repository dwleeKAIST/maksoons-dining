require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { authLimiter, apiLimiter } = require('./server/middleware/rateLimiter');
const migrate = require('./server/db/migrate');

const app = express();

// Trust proxy for Cloud Run
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// 프로덕션: 빌드된 React 앱 서빙
app.use(express.static(path.join(__dirname, 'client/dist')));

// API 라우트
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/wines', require('./server/routes/wines'));
app.use('/api/diary', require('./server/routes/diary'));
app.use('/api/bot', require('./server/routes/bot'));
app.use('/api/ocr', require('./server/routes/ocr'));
app.use('/api/groceries', require('./server/routes/groceries'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA 폴백
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 8080;

async function start() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\nMaksoon's Dining 서비스 실행 중`);
    console.log(`포트: ${PORT}`);
    console.log(`환경: ${process.env.NODE_ENV || 'development'}\n`);
  });

  try {
    await migrate();
    console.log('[server] Database migrations completed');
  } catch (err) {
    console.error('[server] Migration error:', err.message);
    console.log('[server] Continuing without database (check DATABASE_URL)');
  }
}

start();
