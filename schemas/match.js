import mongoose from 'mongoose'

const matchSchema = new mongoose.Schema({
  homeTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  result: String,
  date: {
    type: Date,
    default: Date.now
  },
  teamStatistics: {
    local: {
      goals: Number,
      offsides: Number,
      yellowCards: Number,
      redCards: Number,
      corners: Number,
      shots: Number,
      shotsOnTarget: Number,
      possession: Number,
      foults: Number

    },
    visitor: {
      goals: Number,
      offsides: Number,
      yellowCards: Number,
      redCards: Number,
      corners: Number,
      shots: Number,
      shotsOnTarget: Number,
      possession: Number,
      foults: Number

    }
  },
  isFinished: {
    type: Boolean,
    default: false
  },
  isNeutralCourt: {
    type: Boolean,
    default: false
  },
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League' // Nombre del modelo de la liga
  },
  country: {
    type: String
  },
  seasonYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season' // Nombre del modelo de la Season
  },
  round: { // fecha ej: 4ta, 5ta Antes matchDate
    type: String
  },
  penaltyResult: { // Resultado de penales (opcional)
    homePenalties: {
      type: Number,
      default: 0
    },
    awayPenalties: {
      type: Number,
      default: 0
    }
  },
  referee: { // Campo para asociar el árbitro
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referee' // Nombre del modelo del árbitro
  },
  urlScrape: {
    type: String
  }

})

export const Match = mongoose.model('Match', matchSchema)
