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
      redCards: Number
    },
    visitor: {
      goals: Number,
      offsides: Number,
      yellowCards: Number,
      redCards: Number
    }
  }

})

export const Match = mongoose.model('Match', matchSchema)
