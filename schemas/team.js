import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  city: String,
  ligue: String
})

export const Team = mongoose.model('Team', teamSchema)
