import mongoose from 'mongoose'
import { Referee } from '../../schemas/refereeSchema.js'
import * as ss from 'simple-statistics'

// Create a new referee
export const createReferee = async (req, res) => {
  try {
    const referee = new Referee(req.body)
    await referee.save()
    res.status(201).json(referee)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// Get all referees
export const getAllReferees = async (req, res) => {
  try {
    const referees = await Referee.find()
      .populate({
        path: 'matchesOfficiated.matchId', // Popula el partido
        populate: [
          { path: 'homeTeam', select: 'name' }, // Popula el equipo local (solo nombre)
          { path: 'awayTeam', select: 'name' } // Popula el equipo visitante (solo nombre)
        ]
      })
    res.status(200).json(referees)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get a referee by ID
export const getRefereeById = async (req, res) => {
  try {
    const referee = await Referee.findById(req.params.id)
      .populate({
        path: 'matchesOfficiated.matchId', // Popula el partido
        populate: [
          { path: 'homeTeam', select: 'name' }, // Popula el equipo local (solo nombre)
          { path: 'awayTeam', select: 'name' } // Popula el equipo visitante (solo nombre)
        ]
      })
    if (!referee) {
      return res.status(404).json({ message: 'Referee not found' })
    }
    res.status(200).json(referee)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Update a referee by ID
export const updateReferee = async (req, res) => {
  try {
    const referee = await Referee.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    })
    if (!referee) {
      return res.status(404).json({ message: 'Referee not found' })
    }
    res.status(200).json(referee)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// Delete a referee by ID
export const deleteReferee = async (req, res) => {
  try {
    const referee = await Referee.findByIdAndDelete(req.params.id)
    if (!referee) {
      return res.status(404).json({ message: 'Referee not found' })
    }
    res.status(200).json({ message: 'Referee deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get statistics for a referee
// export const getRefereeStatistics = async (req, res) => {
//   try {
//     const { refereeId } = req.params
//     const matches = await Referee.aggregate([
//       { $match: { _id: new mongoose.Types.ObjectId(refereeId) } },
//       { $unwind: '$matchesOfficiated' },
//       {
//         $group: {
//           _id: '$_id',
//           totalFouls: {
//             $sum: {
//               $add: [
//                 '$matchesOfficiated.statistics.fouls.homeTeam',
//                 '$matchesOfficiated.statistics.fouls.awayTeam'
//               ]
//             }
//           },
//           totalPenalties: {
//             $sum: {
//               $add: [
//                 '$matchesOfficiated.statistics.penalties.homeTeam',
//                 '$matchesOfficiated.statistics.penalties.awayTeam'
//               ]
//             }
//           },
//           totalYellowCards: {
//             $sum: {
//               $add: [
//                 '$matchesOfficiated.statistics.yellowCards.homeTeam',
//                 '$matchesOfficiated.statistics.yellowCards.awayTeam'
//               ]
//             }
//           },
//           totalRedCards: {
//             $sum: {
//               $add: [
//                 '$matchesOfficiated.statistics.redCards.homeTeam',
//                 '$matchesOfficiated.statistics.redCards.awayTeam'
//               ]
//             }
//           }
//         }
//       }
//     ])

//     if (!matches || matches.length === 0) {
//       return res.status(404).json({ message: 'Statistics not found for referee' })
//     }

//     res.status(200).json(matches[0])
//   } catch (error) {
//     res.status(500).json({ error: error.message })
//   }
// }

// Filter referee statistics by home/away matches

export const filterRefereeStatistics = async (req, res) => {
  try {
    const { refereeId, isHome } = req.params
    const { teamId } = req.query

    // Condición para filtrar si el equipo jugó como local o visitante
    const condition = isHome === 'true'
      ? { 'matchesOfficiated.homeTeam': new mongoose.Types.ObjectId(teamId) }
      : { 'matchesOfficiated.awayTeam': new mongoose.Types.ObjectId(teamId) }

    const matches = await Referee.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(refereeId) } },
      { $unwind: '$matchesOfficiated' },
      { $match: condition },
      {
        $group: {
          _id: '$_id',
          totalFouls: {
            $sum: '$matchesOfficiated.statistics.fouls.homeTeam'
          },
          totalPenalties: {
            $sum: '$matchesOfficiated.statistics.penalties.homeTeam'
          },
          totalYellowCards: {
            $sum: '$matchesOfficiated.statistics.yellowCards.homeTeam'
          },
          totalRedCards: {
            $sum: '$matchesOfficiated.statistics.redCards.homeTeam'
          }
        }
      }
    ])

    if (!matches || matches.length === 0) {
      return res.status(404).json({ message: 'No statistics found for the given filter' })
    }

    res.status(200).json(matches[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// export const getRefereeStatistics = async (req, res) => {
//   try {
//     const { refereeId, teamId1, condition, season, limit } = req.query

//     // Construcción de filtro para los partidos oficiados
//     const matchFilters = {}
//     if (season) {
//       matchFilters['matchesOfficiated.matchId.seasonYear'] = season
//     }

//     // Función para calcular estadísticas de un árbitro
//     const calculateStatistics = (referee) => {
//       let totalFoulsHome = 0
//       let totalFoulsAway = 0
//       let totalYellowCardsHome = 0
//       let totalYellowCardsAway = 0
//       let teamName = teamId1 ? '' : 'All teams'
//       const consideredMatches = []
//       const teamStatistics = {}

//       // Acumuladores para media, mediana y desviación estándar
//       const foulsHome = []
//       const foulsAway = []
//       const yellowCardsHome = []
//       const yellowCardsAway = []

//       referee.matchesOfficiated.forEach(({ matchId }) => {
//         if (!matchId || !matchId.teamStatistics) return

//         const { homeTeam, awayTeam, teamStatistics: matchTeamStats, seasonYear } = matchId

//         // Agregar el partido a la lista de partidos considerados
//         consideredMatches.push({
//           matchId: matchId._id,
//           homeTeam: homeTeam.name,
//           awayTeam: awayTeam.name,
//           date: matchId.date,
//           teamStatistics: matchTeamStats
//         })

//         // Acumuladores para la estadística
//         if (teamId1) {
//           const isHomeTeam = homeTeam && homeTeam._id.toString() === teamId1
//           const isAwayTeam = awayTeam && awayTeam._id.toString() === teamId1

//           teamName = isHomeTeam ? homeTeam.name : isAwayTeam ? awayTeam.name : ''

//           if (condition === 'local' && isHomeTeam) {
//             totalFoulsHome += matchTeamStats.local.foults || 0
//             totalYellowCardsHome += matchTeamStats.local.yellowCards || 0
//             foulsHome.push(matchTeamStats.local.foults || 0)
//             yellowCardsHome.push(matchTeamStats.local.yellowCards || 0)
//           } else if (condition === 'visitor' && isAwayTeam) {
//             totalFoulsAway += matchTeamStats.visitor.foults || 0
//             totalYellowCardsAway += matchTeamStats.visitor.yellowCards || 0
//             foulsAway.push(matchTeamStats.visitor.foults || 0)
//             yellowCardsAway.push(matchTeamStats.visitor.yellowCards || 0)
//           }
//         } else {
//           // Sumar estadísticas de todos los partidos
//           if (!condition || condition === 'local') {
//             totalFoulsHome += matchTeamStats.local.foults || 0
//             totalYellowCardsHome += matchTeamStats.local.yellowCards || 0
//             foulsHome.push(matchTeamStats.local.foults || 0)
//             yellowCardsHome.push(matchTeamStats.local.yellowCards || 0)
//           }
//           if (!condition || condition === 'visitor') {
//             totalFoulsAway += matchTeamStats.visitor.foults || 0
//             totalYellowCardsAway += matchTeamStats.visitor.yellowCards || 0
//             foulsAway.push(matchTeamStats.visitor.foults || 0)
//             yellowCardsAway.push(matchTeamStats.visitor.yellowCards || 0)
//           }
//         }

//         // Registrar estadísticas por equipo
//         [homeTeam, awayTeam].forEach((team) => {
//           if (team) {
//             const teamId = team._id.toString()
//             if (!teamStatistics[teamId]) {
//               teamStatistics[teamId] = {
//                 teamName: team.name,
//                 totalFoulsHome: 0,
//                 totalFoulsAway: 0,
//                 totalYellowCardsHome: 0,
//                 totalYellowCardsAway: 0
//               }
//             }

//             if (homeTeam._id.toString() === teamId) {
//               teamStatistics[teamId].totalFoulsHome += matchTeamStats.local.foults || 0
//               teamStatistics[teamId].totalYellowCardsHome += matchTeamStats.local.yellowCards || 0
//             }

//             if (awayTeam._id.toString() === teamId) {
//               teamStatistics[teamId].totalFoulsAway += matchTeamStats.visitor.foults || 0
//               teamStatistics[teamId].totalYellowCardsAway += matchTeamStats.visitor.yellowCards || 0
//             }
//           }
//         })
//       })

//       // Calcular estadísticas adicionales solo si hay datos
//       const calculateStats = (data) => ({
//         mean: data.length > 0 ? ss.mean(data) : 0,
//         median: data.length > 0 ? ss.median(data) : 0,
//         stdDev: data.length > 0 ? ss.standardDeviation(data) : 0
//       })

//       const foulsHomeStats = calculateStats(foulsHome)
//       const foulsAwayStats = calculateStats(foulsAway)
//       const yellowCardsHomeStats = calculateStats(yellowCardsHome)
//       const yellowCardsAwayStats = calculateStats(yellowCardsAway)

//       return {
//         name: referee.name,
//         condition,
//         teamName,
//         totalFoulsHome,
//         totalFoulsAway,
//         totalYellowCardsHome,
//         totalYellowCardsAway,
//         consideredMatches,
//         totalMatches: referee.matchesOfficiated.length, // Total de partidos dirigidos
//         foulsHomeStats,
//         foulsAwayStats,
//         yellowCardsHomeStats,
//         yellowCardsAwayStats,
//         teamStatistics: Object.values(teamStatistics)
//       }
//     }

//     // Si se pasa `refereeId`, retorna estadísticas para un árbitro específico
//     if (refereeId) {
//       if (!mongoose.Types.ObjectId.isValid(refereeId)) {
//         return res.status(400).json({ message: 'Invalid refereeId' })
//       }

//       const referee = await Referee.findById(refereeId).populate({
//         path: 'matchesOfficiated.matchId',
//         select: 'teamStatistics homeTeam awayTeam seasonYear',
//         populate: [
//           { path: 'homeTeam', select: 'name' },
//           { path: 'awayTeam', select: 'name' }
//         ],
//         match: matchFilters,
//         options: {
//           limit: limit ? parseInt(limit) : 0
//         }
//       })

//       if (!referee) {
//         return res.status(404).json({ message: 'Referee not found' })
//       }

//       const statistics = calculateStatistics(referee)
//       return res.status(200).json(statistics)
//     } else {
//       // Si no se pasa `refereeId`, retorna estadísticas para todos los árbitros
//       const referees = await Referee.find().populate({
//         path: 'matchesOfficiated.matchId',
//         select: 'teamStatistics homeTeam awayTeam seasonYear',
//         populate: [
//           { path: 'homeTeam', select: 'name' },
//           { path: 'awayTeam', select: 'name' }
//         ],
//         match: matchFilters,
//         options: {
//           limit: limit ? parseInt(limit) : 0
//         }
//       })

//       const allStatistics = referees.map((referee) => calculateStatistics(referee))
//       return res.status(200).json(allStatistics)
//     }
//   } catch (error) {
//     res.status(500).json({ message: 'Error retrieving statistics', error: error.message })
//   }
// }

export const getRefereeStatistics = async (req, res) => {
  try {
    const { refereeId, teamId1, condition, season, limit } = req.query

    const matchFilters = {}
    if (season) {
      matchFilters['matchesOfficiated.matchId.seasonYear'] = season
    }

    const calculateStatistics = (referee) => {
      let totalFoulsHome = 0
      let totalFoulsAway = 0
      let totalYellowCardsHome = 0
      let totalYellowCardsAway = 0
      let teamName = teamId1 ? '' : 'All teams'
      const consideredMatches = []
      const teamStatistics = {}

      const foulsHome = []
      const foulsAway = []
      const yellowCardsHome = []
      const yellowCardsAway = []

      referee.matchesOfficiated.forEach(({ matchId }) => {
        if (!matchId || !matchId.teamStatistics) return

        const { homeTeam, awayTeam, teamStatistics: matchTeamStats, seasonYear } = matchId

        consideredMatches.push({
          matchId: matchId._id,
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          date: matchId.date,
          teamStatistics: matchTeamStats
        })

        if (teamId1) {
          const isHomeTeam = homeTeam && homeTeam._id.toString() === teamId1
          const isAwayTeam = awayTeam && awayTeam._id.toString() === teamId1

          teamName = isHomeTeam ? homeTeam.name : isAwayTeam ? awayTeam.name : ''

          if (condition === 'local' && isHomeTeam) {
            totalFoulsHome += matchTeamStats.local.foults || 0
            totalYellowCardsHome += matchTeamStats.local.yellowCards || 0
            foulsHome.push(matchTeamStats.local.foults || 0)
            yellowCardsHome.push(matchTeamStats.local.yellowCards || 0)
          } else if (condition === 'visitor' && isAwayTeam) {
            totalFoulsAway += matchTeamStats.visitor.foults || 0
            totalYellowCardsAway += matchTeamStats.visitor.yellowCards || 0
            foulsAway.push(matchTeamStats.visitor.foults || 0)
            yellowCardsAway.push(matchTeamStats.visitor.yellowCards || 0)
          }
        } else {
          if (!condition || condition === 'local') {
            totalFoulsHome += matchTeamStats.local.foults || 0
            totalYellowCardsHome += matchTeamStats.local.yellowCards || 0
            foulsHome.push(matchTeamStats.local.foults || 0)
            yellowCardsHome.push(matchTeamStats.local.yellowCards || 0)
          }
          if (!condition || condition === 'visitor') {
            totalFoulsAway += matchTeamStats.visitor.foults || 0
            totalYellowCardsAway += matchTeamStats.visitor.yellowCards || 0
            foulsAway.push(matchTeamStats.visitor.foults || 0)
            yellowCardsAway.push(matchTeamStats.visitor.yellowCards || 0)
          }
        }

        [homeTeam, awayTeam].forEach((team) => {
          if (team) {
            const teamId = team._id.toString()
            if (!teamStatistics[teamId]) {
              teamStatistics[teamId] = {
                teamName: team.name,
                totalFoulsHome: 0,
                totalFoulsAway: 0,
                totalYellowCardsHome: 0,
                totalYellowCardsAway: 0
              }
            }

            if (homeTeam._id.toString() === teamId) {
              teamStatistics[teamId].totalFoulsHome += matchTeamStats.local.foults || 0
              teamStatistics[teamId].totalYellowCardsHome += matchTeamStats.local.yellowCards || 0
            }

            if (awayTeam._id.toString() === teamId) {
              teamStatistics[teamId].totalFoulsAway += matchTeamStats.visitor.foults || 0
              teamStatistics[teamId].totalYellowCardsAway += matchTeamStats.visitor.yellowCards || 0
            }
          }
        })
      })

      const calculateStats = (data) => ({
        mean: data.length > 0 ? ss.mean(data) : 0,
        median: data.length > 0 ? ss.median(data) : 0,
        stdDev: data.length > 0 ? ss.standardDeviation(data) : 0
      })

      const foulsHomeStats = calculateStats(foulsHome)
      const foulsAwayStats = calculateStats(foulsAway)
      const yellowCardsHomeStats = calculateStats(yellowCardsHome)
      const yellowCardsAwayStats = calculateStats(yellowCardsAway)

      return {
        refereeId: referee._id, // Agregar el ID del árbitro
        name: referee.name,
        condition,
        teamName,
        totalFoulsHome,
        totalFoulsAway,
        totalYellowCardsHome,
        totalYellowCardsAway,
        consideredMatches,
        totalMatches: referee.matchesOfficiated.length, // Total de partidos dirigidos
        foulsHomeStats,
        foulsAwayStats,
        yellowCardsHomeStats,
        yellowCardsAwayStats,
        teamStatistics: Object.values(teamStatistics)
      }
    }

    if (refereeId) {
      if (!mongoose.Types.ObjectId.isValid(refereeId)) {
        return res.status(400).json({ message: 'Invalid refereeId' })
      }

      const referee = await Referee.findById(refereeId).populate({
        path: 'matchesOfficiated.matchId',
        select: 'teamStatistics homeTeam awayTeam seasonYear',
        populate: [
          { path: 'homeTeam', select: 'name' },
          { path: 'awayTeam', select: 'name' }
        ],
        match: matchFilters,
        options: {
          limit: limit ? parseInt(limit) : 0
        }
      })

      if (!referee) {
        return res.status(404).json({ message: 'Referee not found' })
      }

      const statistics = calculateStatistics(referee)
      return res.status(200).json(statistics)
    } else {
      const referees = await Referee.find().populate({
        path: 'matchesOfficiated.matchId',
        select: 'teamStatistics homeTeam awayTeam seasonYear',
        populate: [
          { path: 'homeTeam', select: 'name' },
          { path: 'awayTeam', select: 'name' }
        ],
        match: matchFilters,
        options: {
          limit: limit ? parseInt(limit) : 0
        }
      })

      const allStatistics = referees.map((referee) => calculateStatistics(referee))
      return res.status(200).json(allStatistics)
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving statistics', error: error.message })
  }
}
