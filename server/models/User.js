import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  hash:  { type: String, required: true },
}, { timestamps: true });

userSchema.statics.signup = async function ({ name, email, password }) {
  if (await this.exists({ email })) throw new Error('Email in use');
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return this.create({ name, email, hash });
};

userSchema.methods.verifyPassword = function (pwd) {
  return bcrypt.compare(pwd, this.hash);
};

export default mongoose.model('User', userSchema);
