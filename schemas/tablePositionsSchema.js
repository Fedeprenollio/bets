import mongoose from 'mongoose'

const positionTableSchema = new mongoose.Schema({
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  type: {
    type: String,
    enum: ['general', 'home', 'away'],
    required: true
  },
  positions: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    drawn: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    goalDifference: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    puesto: { type: Number } // Agrega el campo 'puesto' aquí
  }]
})

export const PositionTable = mongoose.model('PositionTable', positionTableSchema)
