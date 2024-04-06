import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  country: String,
  city: String,
  league: String
})

export const Team = mongoose.model('Team', teamSchema)
