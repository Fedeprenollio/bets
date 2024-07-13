import mongoose from 'mongoose'
const leagueSchema = new mongoose.Schema({
  name: String,
  country: String,
  season: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Season' }],
  logo: {
    type: String, // URL de la imagen del escudo del club
    required: false
  }

})

export const League = mongoose.model('League', leagueSchema)
