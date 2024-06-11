import mongoose from 'mongoose'

const positionTableSchema = new mongoose.Schema({
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  type: {
    type: String,
    enum: ['general', 'home', 'away', 'zone-general', 'zone-home', 'zone-away'],
    required: true
  },
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone'
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
}, { versionKey: false })

export const PositionTable = mongoose.model('PositionTable', positionTableSchema)
