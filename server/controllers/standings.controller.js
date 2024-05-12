import { Standings } from '../../schemas/standingsSchema.js'
import { Match } from '../../schemas/match.js'
import mongoose from 'mongoose'

const calculateStats = (matches) => {
  const teamStatsMap = new Map()

  matches.forEach((match) => {
    const { homeTeam, awayTeam, teamStatistics } = match
    const homeGoals = teamStatistics.local.goals
    const awayGoals = teamStatistics.visitor.goals

    const updateTeamStats = (team, goalsFor, goalsAgainst, isHome) => {
      if (!teamStatsMap.has(team._id)) {
        teamStatsMap.set(team._id, {
          team,
          allStats: {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          },
          statsHome: {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          },
          statsVisitor: {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          }
        })
      }

      const stats = teamStatsMap.get(team._id)

      stats.allStats.matchesPlayed++
      if (isHome) {
        stats.statsHome.matchesPlayed++
      } else {
        stats.statsVisitor.matchesPlayed++
      }

      stats.allStats.goalsFor += goalsFor
      stats.allStats.goalsAgainst += goalsAgainst
      if (isHome) {
        stats.statsHome.goalsFor += goalsFor
        stats.statsHome.goalsAgainst += goalsAgainst
      } else {
        stats.statsVisitor.goalsFor += goalsFor
        stats.statsVisitor.goalsAgainst += goalsAgainst
      }

      if (goalsFor > goalsAgainst) {
        stats.allStats.matchesWon++
        if (isHome) {
          stats.statsHome.matchesWon++
        } else {
          stats.statsVisitor.matchesWon++
        }
      } else if (goalsFor < goalsAgainst) {
        stats.allStats.matchesLost++
        if (isHome) {
          stats.statsHome.matchesLost++
        } else {
          stats.statsVisitor.matchesLost++
        }
      } else {
        stats.allStats.matchesDrawn++
        if (isHome) {
          stats.statsHome.matchesDrawn++
        } else {
          stats.statsVisitor.matchesDrawn++
        }
      }

      stats.allStats.goalDifference = stats.allStats.goalsFor - stats.allStats.goalsAgainst
      stats.allStats.points = stats.allStats.matchesWon * 3 + stats.allStats.matchesDrawn
      stats.statsHome.goalDifference = stats.statsHome.goalsFor - stats.statsHome.goalsAgainst
      stats.statsHome.points = stats.statsHome.matchesWon * 3 + stats.statsHome.matchesDrawn
      stats.statsVisitor.goalDifference = stats.statsVisitor.goalsFor - stats.statsVisitor.goalsAgainst
      stats.statsVisitor.points = stats.statsVisitor.matchesWon * 3 + stats.statsVisitor.matchesDrawn
    }

    updateTeamStats(homeTeam, homeGoals, awayGoals, true)
    updateTeamStats(awayTeam, awayGoals, homeGoals, false)
  })

  const teamStats = Array.from(teamStatsMap.values())

  return teamStats
}

const getStandingsBySeason = async (req, res) => {
  try {
    const { seasonId } = req.params
    const allMatches = await Match.find({ seasonYear: seasonId, isFinished: true }).populate('homeTeam').populate('awayTeam')
    const allStats = calculateStats(allMatches)

    // Map each team data to include populated team information
    const populatedStandings = allStats.map((teamData) => ({
      team: teamData.team,
      allStats: teamData.allStats,
      statsHome: teamData.statsHome,
      statsVisitor: teamData.statsVisitor
    }))

    res.status(200).json({ table: populatedStandings })
  } catch (error) {
    console.error('Error getting standings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const updateStandingsForSeason = async (req, res) => {
  const { seasonId } = req.params

  try {
    const allMatches = await Match.find({ seasonYear: seasonId, isFinished: true })

    const teamStats = {}

    allMatches.forEach((match) => {
      const { homeTeam, awayTeam, teamStatistics } = match
      const homeGoals = teamStatistics.local.goals
      const awayGoals = teamStatistics.visitor.goals

      const updateTeamStats = (team, goalsFor, goalsAgainst) => {
        if (!teamStats[team._id]) {
          teamStats[team._id] = {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          }
        }

        teamStats[team._id].matchesPlayed++
        teamStats[team._id].goalsFor += goalsFor
        teamStats[team._id].goalsAgainst += goalsAgainst

        if (goalsFor > goalsAgainst) {
          teamStats[team._id].matchesWon++
        } else if (goalsFor < goalsAgainst) {
          teamStats[team._id].matchesLost++
        } else {
          teamStats[team._id].matchesDrawn++
        }

        teamStats[team._id].goalDifference = teamStats[team._id].goalsFor - teamStats[team._id].goalsAgainst
        teamStats[team._id].points = (teamStats[team._id].matchesWon * 3) + teamStats[team._id].matchesDrawn
      }

      updateTeamStats(homeTeam, homeGoals, awayGoals)
      updateTeamStats(awayTeam, awayGoals, homeGoals)
    })

    const standings = {
      season: seasonId,
      teams: Object.keys(teamStats).map((teamId) => ({
        season: new mongoose.Types.ObjectId(seasonId),
        team: new mongoose.Types.ObjectId(teamId),
        allStats: teamStats[teamId]
      }))
    }

    await Standings.findOneAndUpdate({ season: seasonId }, standings, { upsert: true })

    res.status(200).json({ standings, success: true, message: 'Standings updated successfully' })
  } catch (error) {
    console.error('Error updating standings:', error)
    res.status(500).json({ success: false, message: 'Failed to update standings' })
  }
}

const deleteAllStandings = async (req, res) => {
  try {
    await Standings.deleteMany({})
    res.status(200).json({ success: true, message: 'All standings deleted successfully' })
  } catch (error) {
    console.error('Error deleting standings:', error)
    res.status(500).json({ success: false, message: 'Failed to delete standings' })
  }
}

const getTeamStats = async (req, res) => {
  try {
    const { seasonId, teamId } = req.params
    const standings = await Standings.findOne({ season: seasonId, 'teams.team': teamId })

    if (!standings) {
      return res.status(404).json({ message: 'No standings found for the specified season and team' })
    }

    const teamStats = standings.teams.find(team => team.team.toString() === teamId)

    if (!teamStats) {
      return res.status(404).json({ message: 'No stats found for the specified team' })
    }

    const detailedStats = {
      season: standings.season,
      team: teamStats.team,
      all: teamStats.all,
      visit: teamStats.visit,
      home: teamStats.home
    }

    res.status(200).json({ teamStats: detailedStats })
  } catch (error) {
    console.error('Error getting team stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const getSeasonStats = async (req, res) => {
  try {
    const { seasonId } = req.params
    const standings = await Standings.findOne({ season: seasonId })

    if (!standings) {
      return res.status(404).json({ message: 'No standings found for the specified season' })
    }

    const allTeamStats = standings.teams.map(team => ({
      team: team.team,
      all: team.all,
      visit: team.visit,
      home: team.home
    }))

    const response = {
      season: seasonId,
      teamStats: allTeamStats
    }

    res.status(200).json({ standings, response })
  } catch (error) {
    console.error('Error getting season stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const standingsController = {
  getStandingsBySeason,
  updateStandingsForSeason,
  deleteAllStandings,
  getTeamStats,
  getSeasonStats
}
