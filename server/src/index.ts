import express from 'express';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import dotenv from 'dotenv';
import guestRouter from './routes/guestRouter';
import adminRouter from './routes/adminRouter';
import frontdeskRouter from './routes/frontdeskRouter';
import driverRouter from './routes/driverRouter';
import authRoutes from './utils/auth';
import superAdminRouter from './routes/superAdminRouter';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001","http://localhost:3002","http://localhost:3003"],
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use("/guest", guestRouter);
app.use("/admin", adminRouter);
app.use("/frontdesk", frontdeskRouter);
app.use("/driver", driverRouter);
app.use("/super-admin", superAdminRouter);
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 