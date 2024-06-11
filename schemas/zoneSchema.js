import mongoose from 'mongoose'

const zoneSchema = new mongoose.Schema({
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
  fechas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fecha'
  }],
  standings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standing'
  },
  positionTables: {
    general: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PositionTable'
    },
    home: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PositionTable'
    },
    away: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PositionTable'
    }
  },
  zoneName: { // Añade un campo para el nombre de la zona
    type: String,
    required: true
  }
})

export const Zone = mongoose.model('Zone', zoneSchema)
