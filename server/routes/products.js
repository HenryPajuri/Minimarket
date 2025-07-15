import express from "express";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import { body, validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const items = await Product.find().sort("-createdAt").limit(100);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only images allowed")),
});

router.post("/", requireAuth, upload.array("images", 3), [
  body("name").notEmpty().withMessage("Name required"),
  body("price").isFloat({ min: 0 }).withMessage("Price ≥ 0"),
  body("category").isIn(["clothing", "shoes", "accessories"]).withMessage("Bad category"),
  body("description").isLength({ max: 800 }).optional(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const imgUrls = req.files.map(f => `/uploads/${f.filename}`);

    const product = await Product.create({
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      description: req.body.description || "",
      images: imgUrls,
      image: imgUrls[0] || "",
      owner: req.auth.sub,
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});


router.get("/my-items", requireAuth, async (req, res, next) => {
  try {
    const items = await Product.find({ owner: req.auth.sub })
      .sort("-createdAt")
      .populate("owner", "name");
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const item = await Product.findById(req.params.id).populate("owner", "name");
    if (!item) return res.status(404).json({ msg: "Item not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }
    
    if (product.owner.toString() !== req.auth.sub) {
      return res.status(403).json({ msg: "Not authorized to delete this product" });
    }
    
    if (product.images && product.images.length > 0) {
      product.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, "../", imagePath.replace(/^\//, ""));
        fs.unlink(fullPath, (err) => {
          if (err) console.log("Could not delete image file:", fullPath);
        });
      });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ msg: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;