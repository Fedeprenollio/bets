import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  country: String,
  logo: {
    type: String, // URL de la imagen del escudo del club
    required: false
  }

})

export const Team = mongoose.model('Team', teamSchema)
