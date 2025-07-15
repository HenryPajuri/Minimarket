import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product",
    required: false  // messages can be about a product or general
  },
  content: { 
    type: String, 
    required: true,
    maxlength: 1000 
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create indexes for efficient queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1 });

// Static method to get conversations for a user
messageSchema.statics.getConversations = async function(userId) {
  return this.aggregate([
    // Match messages where user is sender or recipient
    {
      $match: {
        $or: [
          { sender: new mongoose.Types.ObjectId(userId) },
          { recipient: new mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    // Sort by creation date (newest first)
    { $sort: { createdAt: -1 } },
    // Group by conversation (unique pair of sender/recipient)
    {
      $group: {
        _id: {
          $cond: [
            { $lt: ['$sender', '$recipient'] },
            { user1: '$sender', user2: '$recipient' },
            { user1: '$recipient', user2: '$sender' }
          ]
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$recipient', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$read', false] }
                ]
              },
              1,
              0
            ]
          }
        },
        product: { $first: '$product' }
      }
    },
    // Sort conversations by last message date
    { $sort: { 'lastMessage.createdAt': -1 } },
    // Populate user and product info
    {
      $lookup: {
        from: 'users',
        localField: '_id.user1',
        foreignField: '_id',
        as: 'user1'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.user2',
        foreignField: '_id',
        as: 'user2'
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    }
  ]);
};

export default mongoose.model("Message", messageSchema);