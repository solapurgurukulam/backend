const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const favouriteRoutes = require("./src/routes/favouriteRoutes");

dotenv.config();

const app = require("./src/app");

// ============== CORS CONFIGURATION ==============
const allowedOrigins = [
  process.env.FRONTEND_URL,           // e.g. https://frontend-beta-six-57.vercel.app
  "http://solapurgurukulam.com",
  
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`❌ CORS blocked request from origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ✅ Trust Render/proxy headers (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ============== REST OF THE MIDDLEWARE ==============
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET",
  message: { success: false, message: "Too many requests. Please slow down." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please wait 15 minutes." },
});

app.use("/api", limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

app.use(mongoSanitize());
app.use(xss());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Cache-control  
app.use("/api/categories", (req, res, next) => {
  if (req.method === "GET")
    res.setHeader("Cache-Control", "no-store");  
  next();
});
app.use("/api/mantras", (req, res, next) => {
  if (req.method === "GET")
    res.setHeader("Cache-Control", "no-store"); 
  next();
});
app.use("/api/shlokas", (req, res, next) => {
  if (req.method === "GET")
    res.setHeader("Cache-Control", "no-store");  
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
    emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS,
  });
});

// ============================================
// 📧 EMAIL TEST ROUTES - Added for debugging
// ============================================
const emailTestRoutes = require("./src/routes/emailTestRoutes");
app.use("/api/email", emailTestRoutes);

// ============================================
// API Routes
// ============================================
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/categories", require("./src/routes/categoryRoutes"));
app.use("/api/mantras", require("./src/routes/mantraRoutes"));
app.use("/api/shlokas", require("./src/routes/shlokaRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/homepage", require("./src/routes/homepageRoutes"));
app.use("/api/admin", require("./src/routes/adminRoutes"));
app.use("/api/search", require("./src/routes/searchRoutes"));
app.use("/api/shotrams", require("./src/routes/shotramRoutes"));
app.use("/api/favourites", favouriteRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in your .env file. Add it and restart the server.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    
    // Log email configuration status
    console.log(`📧 Email Service: ${process.env.EMAIL_SERVICE || 'Not set (using default)'}`);
    console.log(`📧 Email User: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`📧 Email Password: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
      console.log(`📍 CORS allowed origins: ${allowedOrigins.join(", ")}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`📧 Email test endpoints available at /api/email/test-email-config`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

mongoose.connection.on("error", (err) => {
  console.error("⚠️ MongoDB runtime error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
