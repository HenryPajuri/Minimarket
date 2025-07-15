import express from "express";
import User from "../models/User.js";
import { issueToken, requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { body, validationResult } from "express-validator";
import fetch from "node-fetch";
import { URLSearchParams } from "url";

const router = express.Router();

const signupValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
];

const loginValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required")
];

async function verifyCaptcha(token, ip) {
  const secret = process.env.TURNSTILE_SECRET.trim();
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }).then(r => r.json());

  return res.success === true;
}

router.post("/signup", authLimiter, signupValidation, async (req, res) => {
  const errors = validationResult(req).array();
  
  // TEMPORARY: Comment out captcha validation to test signup flow
  // const ok = await verifyCaptcha(req.body.captchaToken, req.ip);
  // if (!ok) errors.push({ msg: "CAPTCHA failed" });
  
  if (errors.length) return res.status(400).json({ errors });

  try {
    const user = await User.signup(req.body);
    const token = issueToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.post("/login", authLimiter, loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await user.verifyPassword(req.body.password))) {
    return res.status(401).json({ msg: "Wrong email or password" });
  }

  const token = issueToken(user);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  res.json({ msg: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(401).json({ msg: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
});

export default router;