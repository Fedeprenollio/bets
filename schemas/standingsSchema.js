import mongoose from 'mongoose'

const teamStatsSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  all: {
    goals: Number,
    matches_played: Number,
    matches_won: Number,
    matches_drawn: Number,
    matches_lost: Number,
    goals_for: Number,
    goals_against: Number,
    goal_difference: Number
  },
  visit: {
    goals: Number,
    matches_played: Number,
    matches_won: Number,
    matches_drawn: Number,
    matches_lost: Number,
    goals_for: Number,
    goals_against: Number,
    goal_difference: Number
  },
  home: {
    goals: Number,
    matches_played: Number,
    matches_won: Number,
    matches_drawn: Number,
    matches_lost: Number,
    goals_for: Number,
    goals_against: Number,
    goal_difference: Number
  }
})

const standingsSchema = new mongoose.Schema({
  season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  teams: [teamStatsSchema]
})

export const Standings = mongoose.model('Standings', standingsSchema)
