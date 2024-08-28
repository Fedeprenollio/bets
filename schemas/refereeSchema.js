import mongoose from 'mongoose'

const RefereeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nationality: {
    type: String,
    required: false
  },
  matchesOfficiated: [
    {
      matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
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
      date: {
        type: Date,
        required: true
      }
    }
  ]
})

export const Referee = mongoose.model('Referee', RefereeSchema)
