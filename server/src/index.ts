import express from "express";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";
import { createServer } from "http";
import { initWebSocket } from "./ws";
import guestRouter from "./routes/guestRouter";
import adminRouter from "./routes/adminRouter";
import frontdeskRouter from "./routes/frontdeskRouter";
import driverRouter from "./routes/driverRouter";
import authRoutes from "./utils/auth";
import superAdminRouter from "./routes/superAdminRouter";
import tripRouter from "./routes/tripRouter";
import publicRouter from "./routes/publicRouter";
import { CORS_ORIGINS } from "./config/env";
import { startBookingCancellationJob } from "./utils/cronService";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const httpServer = createServer(app);
initWebSocket(httpServer);

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/guest", guestRouter);
app.use("/admin", adminRouter);
app.use("/frontdesk", frontdeskRouter);
app.use("/driver", driverRouter);
app.use("/super-admin", superAdminRouter);
app.use("/trips", tripRouter);
app.use("/public", publicRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);

  // Start the automatic booking cancellation cron job
  startBookingCancellationJob();
});
