import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const conversations = await Message.getConversations(req.auth.sub);
    
    const formattedConversations = conversations.map(conv => {
      const currentUserId = req.auth.sub;
      const otherUser = conv.user1[0]?._id.toString() === currentUserId 
        ? conv.user2[0] 
        : conv.user1[0];
      
      return {
        otherUser: {
          id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email
        },
        lastMessage: {
          content: conv.lastMessage.content,
          createdAt: conv.lastMessage.createdAt,
          sender: conv.lastMessage.sender,
          read: conv.lastMessage.read
        },
        unreadCount: conv.unreadCount,
        product: conv.productInfo[0] ? {
          id: conv.productInfo[0]._id,
          name: conv.productInfo[0].name,
          image: conv.productInfo[0].image
        } : null
      };
    });
    
    res.json(formattedConversations);
  } catch (err) {
    next(err);
  }
});

router.get("/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.auth.sub;
    
    const otherUser = await User.findById(userId);
    if (!otherUser) return res.status(404).json({ msg: "User not found" });
    
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    })
    .populate("sender", "name")
    .populate("recipient", "name")
    .populate("product", "name image")
    .sort({ createdAt: 1 });
    
    await Message.updateMany(
      { sender: userId, recipient: currentUserId, read: false },
      { read: true }
    );
    
    res.json({
      otherUser: { id: otherUser._id, name: otherUser.name },
      messages
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, [
  body("recipient").isMongoId().withMessage("Invalid recipient ID"),
  body("content").trim().isLength({ min: 1, max: 1000 }).withMessage("Message must be 1-1000 characters"),
  body("productId").optional().isMongoId().withMessage("Invalid product ID")
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  try {
    const { recipient, content, productId } = req.body;
    const senderId = req.auth.sub;
    
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) return res.status(404).json({ msg: "Recipient not found" });
    
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ msg: "Product not found" });
    }
    
    const message = await Message.create({
      sender: senderId,
      recipient,
      content,
      product: productId || undefined
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name")
      .populate("recipient", "name")
      .populate("product", "name image");
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    next(err);
  }
});

router.put("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ msg: "Message not found" });
    if (message.recipient.toString() !== req.auth.sub) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    
    message.read = true;
    await message.save();
    res.json({ msg: "Message marked as read" });
  } catch (err) {
    next(err);
  }
});

router.get("/unread/count", requireAuth, async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.auth.sub,
      read: false
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

export default router;