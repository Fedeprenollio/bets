import mongoose from 'mongoose'
const leagueSchema = new mongoose.Schema({
  name: String,
  country: String,
  season: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Season' }]
  // clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  // matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
  // Otros campos relevantes para las ligas
})

export const League = mongoose.model('League', leagueSchema)
