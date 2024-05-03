import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: { type: String, enum: ['Admin', 'User'], default: 'User' }
})

export const User = mongoose.model('User', userSchema)
