import express, { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
   
      // Check if user exists
      let user = await prisma.guest.findUnique({
        where: { email: profile.emails![0].value }
      });

      if (!user) {
        // Create new user if doesn't exist
        user = await prisma.guest.create({
          data: {
            email: profile.emails![0].value,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            googleId: profile.id,
          }
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.guest.findUnique({ where: { id: Number(id) } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // console.log('state:', req.query.hotelId);  // this will now show correctly when you visit /auth/google?state=123

  // Dynamically pass state into authenticate middleware
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: req.query.hotelId as string
  })(req, res, next);
});


router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign(
      { userId: user.id, email: user.email,},
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    // console.log(req.query.state)
    
    if (req.query.state || user.hotelId) {
      // Redirect to frontend with token
      const hotelId = req.query.state ? req.query.state : user.hotelId;
      res.redirect(`${process.env.GUEST_FRONTEND_URL}/auth/callback?token=${token}&hotelId=${hotelId}`);
    } else {
      // Redirect to frontend with token
      res.redirect(`${process.env.GUEST_FRONTEND_URL}/auth/callback?token=${token}`);
    }
  }
);

// Verify token endpoint
router.get('/verify', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await prisma.guest.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router; 