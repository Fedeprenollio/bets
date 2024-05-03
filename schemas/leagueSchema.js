import mongoose from 'mongoose'
const leagueSchema = new mongoose.Schema({
  name: String,
  country: String,
  season: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Season' }]

})

export const League = mongoose.model('League', leagueSchema)
