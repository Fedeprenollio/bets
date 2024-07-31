import { Standings } from '../../schemas/standingsSchema.js'
import { Match } from '../../schemas/match.js'
import { League } from '../../schemas/leagueSchema.js'
import mongoose from 'mongoose'
import { Season } from '../../schemas/seasonSchema.js'
// En caso de igualdad de puntos esta funcion de desepate funciona:
// const tieBreaker = (teamA, teamB, country) => {
//   if (country === 'Argentina') {
//     if (teamA.allStats.goalDifference !== teamB.allStats.goalDifference) {
//       return teamB.allStats.goalDifference - teamA.allStats.goalDifference
//     } else {
//       return teamB.allStats.goalsFor - teamA.allStats.goalsFor
//     }
//   } else if (country === 'Inglaterra') {
//     if (teamA.allStats.goalDifference !== teamB.allStats.goalDifference) {
//       return teamB.allStats.goalDifference - teamA.allStats.goalDifference
//     } else {
//       return teamB.allStats.goalsFor - teamA.allStats.goalsFor
//     }
//   } else if (country === 'España') {
//     if (teamA.allStats.goalDifference !== teamB.allStats.goalDifference) {
//       return teamB.allStats.goalDifference - teamA.allStats.goalDifference
//     } else {
//       return teamB.allStats.goalsFor - teamA.allStats.goalsFor
//     }
//   }
//   return 0
// }
// ESTA aun no ha sido testeada para las condiones
// 2do-Goles a favor: Si hay un empate en la diferencia de goles, el equipo que haya marcado más goles durante la temporada se posiciona más alto en la tabla.

// 3ro . Resultado en enfrentamientos directos: Si dos o más equipos tienen igualdad en la diferencia de goles y en los goles a favor, se considera el resultado de los enfrentamientos directos entre los equipos implicados. El equipo que haya obtenido mejores resultados en los enfrentamientos directos se clasifica por encima.

// 4to Diferencia de goles en enfrentamientos directos: Si el empate persiste, se considera la diferencia de goles en los enfrentamientos directos entre los equipos implicados.

// 5to- Goles a favor en enfrentamientos directos: Si todavía hay empate, se mira cuál equipo ha marcado más goles en los enfrentamientos directos entre los equipos implicados.:
const tieBreaker = (teamA, teamB, country, matches) => {
  if (country === 'Argentina') {
    if (teamA.allStats.goalDifference !== teamB.allStats.goalDifference) {
      return teamB.allStats.goalDifference - teamA.allStats.goalDifference
    } else if (teamA.allStats.goalsFor !== teamB.allStats.goalsFor) {
      return teamB.allStats.goalsFor - teamA.allStats.goalsFor
    } else {
      const directMatchResults = matches.filter(match =>
        (match.homeTeam._id.toString() === teamA.team._id.toString() && match.awayTeam._id.toString() === teamB.team._id.toString()) ||
        (match.homeTeam._id.toString() === teamB.team._id.toString() && match.awayTeam._id.toString() === teamA.team._id.toString())
      )

      const teamAResults = { points: 0, goalDifference: 0, goalsFor: 0 }
      const teamBResults = { points: 0, goalDifference: 0, goalsFor: 0 }

      directMatchResults.forEach(match => {
        if (match.homeTeam._id.toString() === teamA.team._id.toString()) {
          teamAResults.goalsFor += match.teamStatistics.local.goals
          teamAResults.goalDifference += match.teamStatistics.local.goals - match.teamStatistics.visitor.goals
          teamBResults.goalsFor += match.teamStatistics.visitor.goals
          teamBResults.goalDifference += match.teamStatistics.visitor.goals - match.teamStatistics.local.goals

          if (match.teamStatistics.local.goals > match.teamStatistics.visitor.goals) {
            teamAResults.points += 3
          } else if (match.teamStatistics.local.goals < match.teamStatistics.visitor.goals) {
            teamBResults.points += 3
          } else {
            teamAResults.points += 1
            teamBResults.points += 1
          }
        } else {
          teamAResults.goalsFor += match.teamStatistics.visitor.goals
          teamAResults.goalDifference += match.teamStatistics.visitor.goals - match.teamStatistics.local.goals
          teamBResults.goalsFor += match.teamStatistics.local.goals
          teamBResults.goalDifference += match.teamStatistics.local.goals - match.teamStatistics.visitor.goals

          if (match.teamStatistics.visitor.goals > match.teamStatistics.local.goals) {
            teamAResults.points += 3
          } else if (match.teamStatistics.visitor.goals < match.teamStatistics.local.goals) {
            teamBResults.points += 3
          } else {
            teamAResults.points += 1
            teamBResults.points += 1
          }
        }
      })

      if (teamAResults.points !== teamBResults.points) {
        return teamBResults.points - teamAResults.points
      } else if (teamAResults.goalDifference !== teamBResults.goalDifference) {
        return teamBResults.goalDifference - teamAResults.goalDifference
      } else {
        return teamBResults.goalsFor - teamAResults.goalsFor
      }
    }
  } else if (country === 'Inglaterra' || country === 'España') {
    if (teamA.allStats.goalDifference !== teamB.allStats.goalDifference) {
      return teamB.allStats.goalDifference - teamA.allStats.goalDifference
    } else {
      return teamB.allStats.goalsFor - teamA.allStats.goalsFor
    }
  }
  return 0
}

export const calculateStats = (matches, country) => {
  console.log('matchesSS', matches)
  const teamStatsMap = {}

  matches.forEach((match) => {
    const { homeTeam, awayTeam, teamStatistics, round } = match
    const homeGoals = teamStatistics.local.goals
    const awayGoals = teamStatistics.visitor.goals

    const isPlayoff = isNaN(round)
    console.log('isPlayoff', isPlayoff)
    // Si es un partido de playoff, salta el procesamiento de este partido
    if (isPlayoff) return

    const updateTeamStats = (team, goalsFor, goalsAgainst, isHome) => {
      if (!teamStatsMap[team._id]) {
        teamStatsMap[team._id] = {
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
        }
      }

      const stats = teamStatsMap[team._id]

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

  const teamStats = Object.values(teamStatsMap)

  teamStats.sort((teamA, teamB) => {
    if (teamA.allStats.points !== teamB.allStats.points) {
      return teamB.allStats.points - teamA.allStats.points
    } else {
      return tieBreaker(teamA, teamB, country, matches)
    }
  })

  return teamStats
}

export const calculateZoneStats = (allStats, zoneTeams) => {
  // Filtramos las estadísticas generales para incluir solo los equipos de la zona
  return allStats.filter(teamStats => zoneTeams.includes(teamStats.team._id.toString()))
}

const getStandingsBySeason = async (req, res) => {
  try {
    const { seasonId } = req.params
    const allMatches = await Match.find({ seasonYear: seasonId, isFinished: true }).populate('homeTeam').populate('awayTeam')
    console.log('YESSSS', allMatches)
    const season = await Season.findById(seasonId).populate('zones').populate('league')
    const leagueId = season.league
    const league = await League.findById(leagueId)

    if (!league.country) {
      return res.status(404).json({ message: 'No country found for the specified season' })
    }

    const allStats = calculateStats(allMatches, league.country)
    const populatedStandings = allStats.map((teamData) => ({
      team: teamData.team,
      allStats: teamData.allStats,
      statsHome: teamData.statsHome,
      statsVisitor: teamData.statsVisitor
    }))

    const zoneTables = []

    if (season.zones && Array.isArray(season.zones) && season.zones.length > 0) {
      for (const zone of season.zones) {
        const zoneName = zone.zoneName
        const zoneTeams = zone.teams.map(team => team._id.toString())
        const zoneStats = calculateZoneStats(populatedStandings, zoneTeams)

        zoneTables.push({
          zoneName,
          teams: zoneStats.map((teamData) => ({
            team: teamData.team,
            allStats: teamData.allStats,
            statsHome: teamData.statsHome,
            statsVisitor: teamData.statsVisitor
          }))
        })
      }
    }

    res.status(200).json({ table: populatedStandings, zoneTables, season })
  } catch (error) {
    console.error('Error getting standings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const updateStandingsForSeason = async (req, res) => {
  const { seasonId } = req.params

  try {
    const allMatches = await Match.find({ seasonYear: seasonId, isFinished: true })
    console.log('allMatches', allMatches)
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
