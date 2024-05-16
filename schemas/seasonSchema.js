import mongoose from 'mongoose'

const seasonSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: true
  },
  year: {
    type: String,
    required: true
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  numberOfRounds: {
    type: Number
  },
  isCurrentSeason: {
    type: Boolean
  },
  fechas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fecha'
  }],
  standings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standing'
  }
})

export const Season = mongoose.model('Season', seasonSchema)
