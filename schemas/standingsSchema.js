import mongoose from 'mongoose'

const standingsSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League' },
  season: String,
  standings: [{
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    points: Number,
    position: Number
  }]
})

const Standings = mongoose.model('Standings', standingsSchema)

module.exports = Standings
