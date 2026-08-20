const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
require("./src/config/db");


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
// credentials: true + an explicit origin (never "*") so the auth cookie can be sent/received
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", authRoutes)
app.use("/api", contentRoutes)
app.use("/api", wordpressRoutes)
app.use("/api", applicationRoutes)
app.use("/api", newsRoutes)
app.use("/api", politiciansRoutes)
app.use("/api", careersRoutes)

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Surfaces multer errors (bad file type, file too large) as JSON instead of
// Express's default HTML error page, which the frontend can't parse.
app.use((err, req, res, next) => {
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
