const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const pool = require("./src/config/db");


const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/config/swagger");
const PORT = process.env.PORT || 8000;
const authRoutes = require("./src/routes/auth.routes.js")
const contentRoutes = require("./src/routes/content.routes.js")
const wordpressRoutes = require("./src/routes/wordpress.routes.js")
const applicationRoutes = require("./src/routes/applications.routes.js")
const newsRoutes = require("./src/routes/news.routes.js")
const politiciansRoutes = require("./src/routes/politicians.routes.js")
const careersRoutes = require("./src/routes/careers.routes.js")
const categoriesRoutes = require("./src/routes/categories.routes.js")
const contactRoutes = require("./src/routes/contact.routes.js")
const referenceDataRoutes = require("./src/routes/referenceData.routes.js")
const walletRoutes = require("./src/routes/wallet.routes.js")
const policiesRoutes = require("./src/routes/policies.routes.js")
const commentsRoutes = require("./src/routes/comments.routes.js")
const contentLimitsRoutes = require("./src/routes/contentLimits.routes.js")
const deletionsRoutes = require("./src/routes/deletions.routes.js")
const { publishDueScheduledContent } = require("./src/services/scheduledPublishing.service.js");

const REQUIRED_PRODUCTION_ENV = ["CLIENT_ORIGIN", "JWT_SECRET", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missingProductionEnv = REQUIRED_PRODUCTION_ENV.filter((name) => !process.env[name]);
if (process.env.NODE_ENV === "production" && missingProductionEnv.length) {
  throw new Error(`Missing required production environment variables: ${missingProductionEnv.join(", ")}`);
}

const allowedOrigins = new Set([
  process.env.CLIENT_ORIGIN || "",
  process.env.PANEL_ORIGIN || "https://indianrajneeti.com",
  process.env.API_PUBLIC_URL || "",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
]
  .flatMap((value) => value.split(","))
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests / health checks
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error(`CORS blocked origin: ${origin}`);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({
  verify(req, res, buffer) {
    if (req.originalUrl === "/api/wallet/razorpay/webhook") {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(cookieParser());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    etag: true,
    immutable: true,
    maxAge: "1y",
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", authRoutes)
app.use("/api", contentRoutes)
app.use("/api", wordpressRoutes)
app.use("/api", applicationRoutes)
app.use("/api", newsRoutes)
app.use("/api", politiciansRoutes)
app.use("/api", careersRoutes)
app.use("/api", categoriesRoutes)
app.use("/api", contactRoutes)
app.use("/api", referenceDataRoutes)
app.use("/api", walletRoutes)
app.use("/api", policiesRoutes)
app.use("/api", commentsRoutes)
app.use("/api", contentLimitsRoutes)
app.use("/api", deletionsRoutes)

app.get("/", (req, res) => {
  res.send("API is running...");
});
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ success: true, status: "healthy" });
  } catch {
    return res.status(503).json({ success: false, status: "unhealthy" });
  }
});

// Surfaces multer errors (bad file type, file too large) as JSON instead of
// Express's default HTML error page, which the frontend can't parse.
app.use((err, req, res, next) => {
  if (err?.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ success: false, message: err.message });
  }
  if (err?.type === "entity.parse.failed" || (err instanceof SyntaxError && err?.status === 400)) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body. Remove trailing commas and check the request syntax.",
    });
  }
  if (err && err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large." : err.message;
    return res.status(400).json({ success: false, message });
  }
  if (err && /^Unsupported file type/.test(err.message || "")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ success: false, message: "Internal server error" });
});

async function startServer() {
  await pool.verifyConnection();
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  publishDueScheduledContent().catch((error) => console.error("Scheduled publishing error:", error));
  const scheduledPublishingTimer = setInterval(() => {
    publishDueScheduledContent().catch((error) => console.error("Scheduled publishing error:", error));
  }, 30_000);
  scheduledPublishingTimer.unref();

  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down gracefully.`);
    clearInterval(scheduledPublishingTimer);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
