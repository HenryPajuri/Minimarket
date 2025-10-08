import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import messageRoutes from "./routes/messages.js";

dotenv.config();
await connectDB();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));


if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        frameSrc: ["'self'", "https://challenges.cloudflare.com"],
        scriptSrc: [
          "'self'",
          "https://challenges.cloudflare.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'"], // Turnstile needs inline styles
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://challenges.cloudflare.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        formAction: ["'self'"]
      },
    },
  })
);

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? [
        "https://minimarket-f1r5.onrender.com",
        "https://c4109d10.minimarket.pages.dev",
        "https://minimarket.pages.dev",
        "https://plaireplai.com",
        "https://www.plaireplai.com"
      ]
    : "http://localhost:4000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(csrf({ cookie: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.get("/api/csrf", (req, res) => res.json({ csrfToken: req.csrfToken() }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.redirect("/html/index.html");
});

app.use(express.static(path.join(__dirname, "../front-end")));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ msg: "Server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✔ API ready on :${PORT}`));