import * as ss from 'simple-statistics'
import { Match } from '../../schemas/match.js'
import { Team } from '../../schemas/team.js'
import { League } from '../../schemas/leagueSchema.js'
import { Fecha } from '../../schemas/fechaSchema.js'
import { Season } from '../../schemas/seasonSchema.js'
import { PositionTable } from '../../schemas/tablePositionsSchema.js'
import {
  updateSeasonPositionTable,
  updateZonePositionTablesFromGeneral
} from '../services/updatePositionTables.js'
import {
  calculateStats as calculateStatsTable,
  calculateZoneStats
} from './standings.controller.js'

// Controlador para obtener todos los partidos con filtros opcionales
const getAllMatches = async (req, res) => {
  try {
    const query = {}

    if (req.query.isFinished) {
      if (req.query.isFinished !== 'all') {
        query.isFinished = req.query.isFinished === 'true'
      }
      // No incluir el campo isFinished en la consulta si req.query.isFinished es 'all'
    }

    if (req.query.league && req.query.league.toLowerCase() !== 'all') {
      const encodedLeague = decodeURIComponent(req.query.league)
      query.league = encodedLeague
    }

    if (req.query.country && req.query.country.toLowerCase() !== 'all') {
      const encodedCountry = decodeURIComponent(req.query.country)
      query.country = encodedCountry
    }

    if (req.query.seasonYear) {
      // Ahora es un id de la temporada
      const yearId = req.query.seasonYear
      query.seasonYear = yearId
    }

    if (req.query.round && req.query.round.toLowerCase() !== 'all') {
      query.round = req.query.round
    }

    // Agregar filtro por fecha si se proporciona
    if (req.query.date) {
      const selectedDate = new Date(req.query.date)
      const nextDay = new Date(selectedDate)
      nextDay.setDate(nextDay.getDate() + 1) // Añadir un día para obtener la fecha límite

      query.date = {
        $gte: selectedDate, // Fecha de inicio del día seleccionado
        $lt: nextDay // Fecha de fin del día siguiente
      }
    }

    // Agregar filtro por ID de temporada si se proporciona
    if (req.query.seasonId) {
      const seasonId = req.query.seasonId
      query.seasonYear = seasonId
    }

    const matches = await Match.find(query)
      .populate('homeTeam awayTeam')
      .populate('league')
      .populate('seasonYear')

    res.send(matches)
  } catch (error) {
    console.error('Error fetching matches:', error)
    res.status(500).send('An error occurred while fetching matches')
  }
}

const createMatch = async (req, res) => {
  try {
    const {
      homeTeamName,
      awayTeamName,
      date,
      league,
      seasonYear,
      round,
      country
    } = req.body

    // Buscar los IDs de los equipos en la base de datos
    const homeTeam = await Team.findOne({ name: homeTeamName })
    const awayTeam = await Team.findOne({ name: awayTeamName })

    if (!homeTeam || !awayTeam) {
      return res
        .status(400)
        .send('Uno o ambos equipos no existen en la base de datos')
    }

    // Crear un nuevo partido con los IDs encontrados y la fecha proporcionada
    const match = new Match({
      homeTeam: homeTeam._id,
      awayTeam: awayTeam._id,
      date,
      country,
      league,
      seasonYear,
      round
    })

    // Guardar el partido
    await match.save()
    // Obtener la temporada correspondiente
    const season = await Season.findOne({ year: seasonYear })

    // Verificar si la temporada existe
    if (!season) {
      return res
        .status(400)
        .send('La temporada especificada no existe en la base de datos')
    }

    // Obtener la fecha correspondiente (o crear una nueva si no existe)
    let fecha = await Fecha.findOne({ number: round, season: seasonYear })

    if (!fecha) {
      fecha = new Fecha({ number: round, season: seasonYear })
      await fecha.save()
    }

    // Agregar el partido a la fecha
    fecha.matches.push(match._id)
    await fecha.save()

    // Asociar la fecha a la temporada
    season.fechas.push(fecha._id)
    await season.save()

    // Obtener toda la información de los equipos y agregarla a la respuesta
    const populatedMatch = await match.populate('homeTeam awayTeam')

    // Actualizar la lista de partidos en la liga correspondiente
    const updatedLeague = await League.findByIdAndUpdate(
      league,
      { $push: { matches: match._id } },
      { new: true }
    )

    res.status(201).send(populatedMatch)
  } catch (error) {
    console.error('Error creating match:', error)
    res.status(500).send('An error occurred while creating the match')
  }
}

// Controlador para actualizar el resultado de un partido
// const updateMatchResult = async (req, res) => {
//   try {
//     const { goalsHome, goalsAway, teamStatistics } = req.body
//     const matchId = req.params.id
//     const match = await Match.findById(matchId)
//     if (!match) {
//       return res.status(404).send('Partido no encontrado')
//     }
//     // Actualizar estadísticas del equipo local
//     match.teamStatistics.local.goals = teamStatistics.local.goals
//     match.teamStatistics.local.shots = teamStatistics.local.totalShots
//     match.teamStatistics.local.shotsOnTarget = teamStatistics.local.shotsOnTarget
//     match.teamStatistics.local.possession = teamStatistics.local.possession
//     // faltas
//     match.teamStatistics.local.offsides = teamStatistics.local.offsides
//     match.teamStatistics.local.yellowCards = teamStatistics.local.yellowCards
//     match.teamStatistics.local.corners = teamStatistics.local.corners
//     match.teamStatistics.local.foults = teamStatistics.local.foults

//     match.teamStatistics.local.redCards = teamStatistics.local.redCards
//     // Actualizar estadísticas del equipo visitante
//     match.teamStatistics.visitor.goals = teamStatistics.visitor.goals
//     match.teamStatistics.visitor.offsides = teamStatistics.visitor.offsides
//     match.teamStatistics.visitor.yellowCards = teamStatistics.visitor.yellowCards
//     match.teamStatistics.visitor.corners = teamStatistics.visitor.corners
//     match.teamStatistics.visitor.possession = teamStatistics.visitor.possession
//     match.teamStatistics.visitor.shotsOnTarget = teamStatistics.visitor.shotsOnTarget
//     match.teamStatistics.visitor.shots = teamStatistics.visitor.totalShots
//     match.teamStatistics.visitor.foults = teamStatistics.visitor.foults

//     match.teamStatistics.visitor.redCards = teamStatistics.visitor.redCards

//     // Actualizar resultado del partido
//     match.goalsHome = goalsHome
//     match.goalsAway = goalsAway
//     match.isFinished = true
//     await match.save()
//     res.status(200).send(match)
//   } catch (error) {
//     console.error('Error updating match result:', error)
//     res.status(500).send('An error occurred while updating match result')
//   }
// }
const updateMatchResult = async (req, res) => {
  try {
    const { goalsHome, goalsAway, teamStatistics, penaltyResult } = req.body
    const matchId = req.params.id
    console.log('penaltyResult', penaltyResult)
    // Buscar el partido por ID
    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).send('Partido no encontrado')
    }

    // Actualizar estadísticas del equipo local
    const updateTeamStats = (teamStats, stats) => {
      teamStats.goals = stats.goals
      teamStats.shots = stats.totalShots
      teamStats.shotsOnTarget = stats.shotsOnTarget
      teamStats.possession = stats.possession
      teamStats.offsides = stats.offsides
      teamStats.yellowCards = stats.yellowCards
      teamStats.corners = stats.corners
      teamStats.foults = stats.foults
      teamStats.redCards = stats.redCards
    }

    updateTeamStats(match.teamStatistics.local, teamStatistics.local)
    updateTeamStats(match.teamStatistics.visitor, teamStatistics.visitor)

    // Actualizar resultado del partido
    match.goalsHome = goalsHome
    match.goalsAway = goalsAway
    match.isFinished = true

    // Si se proporciona resultado de penales, actualizarlo
    if (penaltyResult) {
      match.penaltyResult = {
        homePenalties: penaltyResult.homePenalties || 0,
        awayPenalties: penaltyResult.awayPenalties || 0
      }
    }

    // Guardar el partido actualizado
    await match.save()

    // Actualizar la tabla de posiciones
    // await updatePositionTable(match.seasonYear, match.league)

    res.status(200).send(match)
  } catch (error) {
    console.error('Error updating match result:', error)
    res.status(500).send('An error occurred while updating match result')
  }
}

// Controlador para obtener un partido por su ID
const getMatchById = async (req, res, next) => {
  try {
    const id = req.params.id
    if (!id) {
      return res.status(404).send({ message: 'Id de partido no ingresado' })
    }
    const match = await Match.findById(id).populate('awayTeam homeTeam league')
    if (!match) {
      return res.status(404).send({ message: 'Partido no encotrado' })
    }
    res.send(match)
  } catch (error) {
    console.error('Error fetching match by ID:', error)
    res
      .status(500)
      .send({ error: 'An error occurred while fetching match by ID' })
  }
}

// Controlador para obtener todos los partidos de un equipo
const getMatchesByTeamId = async (req, res) => {
  try {
    const idTeam = req.params.idTeam

    // Buscar todos los partidos en los que el equipo participó como local
    const homeMatches = await Match.find({ homeTeam: idTeam })
      .populate({
        path: 'homeTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo local
      })
      .populate({
        path: 'awayTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo visitante
      })
      .populate('league seasonYear') // Populate para la información completa de la liga y la temporada
    // Buscar todos los partidos en los que el equipo participó como visitante
    const awayMatches = await Match.find({ awayTeam: idTeam })
      .populate({
        path: 'homeTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo local
      })
      .populate({
        path: 'awayTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo visitante
      })
      .populate('league seasonYear') // Populate para la información completa de la liga y la temporada

    // Combinar los partidos como local y como visitante en una sola lista
    const allMatches = [...homeMatches, ...awayMatches]

    res.status(200).send(allMatches)
  } catch (error) {
    console.error('Error fetching matches by team ID:', error)
    res.status(500).send('An error occurred while fetching matches by team ID')
  }
}

// Controlador para obtener estadísticas de un equipo

const getTeamStats = async (req, res) => {
  try {
    const idTeam = req.params.idTeam
    if (!idTeam) {
      return res.status(200).json({})
    }

    const {
      statistic,
      matchesCount = 5,
      homeOnly = true,
      awayOnly = true,
      lowerLimit,
      upperLimit,
      lessThan = false,
      currentSeason,
      position
    } = req.query

    const booleanHomeOnly = homeOnly === 'true'
    const booleanAwayOnly = awayOnly === 'true'
    const booleanLessThan = lessThan === 'true'
    const booleanPosition = position !== 'false'
    const query = {
      $and: [{ isFinished: true }]
    }

    if (booleanHomeOnly && !booleanAwayOnly) {
      query.$and.push({ homeTeam: idTeam })
    } else if (booleanAwayOnly && !booleanHomeOnly) {
      query.$and.push({ awayTeam: idTeam })
    } else if (booleanHomeOnly && booleanAwayOnly) {
      query.$and.push({
        $or: [{ homeTeam: idTeam }, { awayTeam: idTeam }]
      })
    } else {
      const emptyStats = {
        matchesTotalFinished: 0,
        few: 0,
        many: 0,
        total: 0,
        values: []
      }

      const allStats = {
        teamId: idTeam,
        teamName: 'Nombre del Equipo',
        matches: [],
        matchesCount: 0,
        homeOnly,
        awayOnly,
        [statistic]: emptyStats,
        lessThan,
        receivedStats: emptyStats
      }
      return res.status(200).json(allStats)
    }

    if (booleanPosition) {
      if (currentSeason) {
        query.$and.push({ seasonYear: currentSeason })
      }
      const [start, end] = position.split('-').map(Number)

      const zoneId = await getZoneIdByTeam(idTeam, currentSeason)

      if (zoneId) {
        console.log('++++Actualizar tablas de posición de zonas')
        await updateZonePositionTablesFromGeneral(currentSeason) // Actualizar tablas de posición de zonas
        const zonePositionTable = await PositionTable.findOne({
          zone: zoneId
        }).populate('positions.team')
        if (!zonePositionTable || !zonePositionTable.positions) {
          return res.status(404).json({ message: 'Zone Positions not found' })
        }
        const teamsInRange = zonePositionTable.positions
          .filter(
            (position) => position.puesto >= start && position.puesto <= end
          )
          .map((position) => position.team._id.toString())

        query.$and.push({
          $or: [
            { homeTeam: idTeam, awayTeam: { $in: teamsInRange } },
            { awayTeam: idTeam, homeTeam: { $in: teamsInRange } }
          ]
        })
      } else {
        await updateSeasonPositionTable(currentSeason) // Actualizar tabla de posición general
        const generalPositionTable = await PositionTable.findOne({
          season: currentSeason,
          type: 'general'
        }).populate('positions.team')
        if (!generalPositionTable || !generalPositionTable.positions) {
          return res
            .status(404)
            .json({ message: 'General Positions not found' })
        }
        const teamsInRange = generalPositionTable.positions
          .filter(
            (position) => position.puesto >= start && position.puesto <= end
          )
          .map((position) => position.team._id.toString())

        query.$and.push({
          $or: [
            { homeTeam: idTeam, awayTeam: { $in: teamsInRange } },
            { awayTeam: idTeam, homeTeam: { $in: teamsInRange } }
          ]
        })
      }
    }
    const matches = await Match.find(query)
      .sort({ date: -1 })
      .limit(parseInt(matchesCount))
      .populate({
        path: 'league',
        select: 'name'
      })
      .populate('homeTeam awayTeam')
      .populate('seasonYear', 'year')
    const team = await Team.findById(idTeam)

    const generateStats = (
      matches,
      statistic,
      lowerLimit,
      upperLimit,
      isReceived = false
    ) => {
      const stats = {
        matchesTotalFinished: matches?.length || 0,
        few: 0,
        many: 0,
        total: 0,
        values: []
      }

      const ranges = []
      for (let i = parseFloat(lowerLimit); i <= parseFloat(upperLimit); i++) {
        ranges.push(i)
      }

      ranges.forEach((range) => {
        const key = `matchesWith${range.toString().replace('.', '_')}`
        stats[key] = 0
      })

      matches.forEach((match) => {
        const teamStats = match.homeTeam.equals(idTeam)
          ? isReceived
            ? match.teamStatistics.visitor
            : match.teamStatistics.local
          : isReceived
            ? match.teamStatistics.local
            : match.teamStatistics.visitor

        const statValue = teamStats[statistic]
        stats.total += statValue
        stats.values.push(statValue)

        ranges.forEach((range) => {
          const key = `matchesWith${range.toString().replace('.', '_')}`
          if (booleanLessThan) {
            if (statValue < range) {
              stats[key]++
            }
          } else {
            if (statValue >= range) {
              stats[key]++
            }
          }
        })

        if (booleanLessThan) {
          if (statValue < lowerLimit) {
            stats.few++
          }
        } else {
          if (statValue >= lowerLimit) {
            stats.few++
          }
        }
      })

      return stats
    }

    const stats = generateStats(
      matches,
      statistic,
      parseFloat(lowerLimit),
      parseFloat(upperLimit)
    )

    const receivedStats = generateStats(
      matches,
      statistic,
      parseFloat(lowerLimit),
      parseFloat(upperLimit),
      true
    )

    const allStats = {
      teamId: team._id,
      teamName: team.name,
      matches,
      matchesCount,
      homeOnly,
      awayOnly,
      [statistic]: { ...stats, receivedStats },
      lessThan,
      receivedStats,
      matchesWithStatistic: matches.filter((match) => {
        const teamStats = match.homeTeam.equals(idTeam)
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const statValue = teamStats[statistic]
        if (booleanLessThan) {
          return statValue < parseFloat(upperLimit)
        } else {
          return statValue >= parseFloat(lowerLimit)
        }
      }),
      matchesWithRange: matches.filter((match) => {
        const teamStats = match.homeTeam.equals(idTeam)
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const statValue = teamStats[statistic]
        if (booleanLessThan) {
          return (
            parseFloat(lowerLimit) < statValue &&
            statValue < parseFloat(upperLimit)
          )
        } else {
          return (
            parseFloat(lowerLimit) <= statValue &&
            statValue <= parseFloat(upperLimit)
          )
        }
      })
    }
    res.status(200).json(allStats)
  } catch (error) {
    console.error('Error fetching matches by team ID:', error)
    res.status(500).send('An error occurred while fetching matches by team ID')
  }
}

// const getAllTeamsStats = async (req, res) => {
//   const {
//     season,
//     statistics, // Expected to be a string with multiple statistics separated by commas
//     matchesCount,
//     homeOnly = 'true',
//     awayOnly = 'true'
//   } = req.query

//   try {
//     const booleanHomeOnly = homeOnly === 'true'
//     const booleanAwayOnly = awayOnly === 'true'

//     const query = {
//       isFinished: true
//     }

//     if (season) {
//       query.seasonYear = season
//     }

//     let teamIds = []
//     if (season) {
//       const seasonData = await Season.findOne({ year: season }).populate(
//         'teams'
//       )
//       if (seasonData) {
//         teamIds = seasonData.teams.map((team) => team._id.toString())
//       }
//     }

//     if (teamIds.length > 0) {
//       query.$or = [
//         { homeTeam: { $in: teamIds } },
//         { awayTeam: { $in: teamIds } }
//       ]
//     }

//     const matches = await Match.find(query)
//       .sort({ date: -1 })
//       .populate('homeTeam awayTeam')
//       .populate('seasonYear', 'year')

//     // Función para determinar los rangos con sus propiedades count y percentage
//     const determineRanges = ([start, end], step) => {
//       const ranges = {}
//       const precision = step === 1 ? 1 : 2

//       for (let i = start; i <= end; i += step) {
//         const rangeKey = i.toFixed(precision).replace('.', '_')
//         ranges[rangeKey] = { count: 0, percentage: 0 } // Inicializar contador y porcentaje en 0 para el rango
//       }
//       return ranges
//     }
//     const generateStats = (matches, statistics, teamId) => {
//       const stats = {
//         matchesTotalFinished: matches?.length || 0
//       }

//       // Verificar si statistics está vacío o no definido
//       if (!statistics || statistics.length === 0) {
//         console.error('No se proporcionaron estadísticas válidas.')
//         return stats // Devolver stats vacío o inicializado según sea necesario
//       }

//       statistics.forEach((statistic) => {
//         // Asegurarse de inicializar stats[statistic] correctamente
//         stats[statistic] = {
//           total: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           },
//           received: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           },
//           scored: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           }
//         }

//         //  Initialize ranges for over and under
//         switch (statistic) {
//           case 'possession':
//             stats[statistic].received.overRanges = determineRanges([40.5, 99.5], 5)
//             stats[statistic].scored.overRanges = determineRanges([40.5, 99.5], 5)
//             break
//           case 'goals':
//             stats[statistic].received.overRanges = determineRanges([0.5, 6.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([0.5, 6.5], 1)
//             stats[statistic].total.overRanges = determineRanges([2.5, 11.5], 1)
//             break

//           case 'corners':
//             stats[statistic].total.overRanges = determineRanges([10.5, 20.5], 2)
//             stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
//             break

//           case 'offsides':
//             stats[statistic].total.overRanges = determineRanges([8.5, 16.5], 1)
//             stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
//             break

//           case 'yellowCards':
//             stats[statistic].total.overRanges = determineRanges([3.5, 8.5], 1)
//             stats[statistic].received.overRanges = determineRanges([1.5, 5.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([1.5, 5.5], 1)
//             break

//           case 'shots':
//             stats[statistic].total.overRanges = determineRanges([18.5, 30.5], 2)
//             stats[statistic].received.overRanges = determineRanges([18.5, 30.5], 2)
//             stats[statistic].scored.overRanges = determineRanges([18.5, 30.5], 2)
//             break

//           case 'shotsOnTarget':
//             stats[statistic].total.overRanges = determineRanges([5.5, 16.5], 2)
//             stats[statistic].received.overRanges = determineRanges([5.5, 11.5], 2)
//             stats[statistic].scored.overRanges = determineRanges([5.5, 11.5], 2)
//             break

//           default:
//             break
//         }

//         // Initialize underRanges based on overRanges for each category
//         ['total', 'received', 'scored'].forEach((type) => {
//           const overRanges = stats[statistic][type].overRanges
//           Object.keys(overRanges).forEach((rangeKey) => {
//             stats[statistic][type].underRanges[rangeKey] = {
//               count: 0,
//               percentage: 0
//             }
//           })
//         })
//       })

//       // Procesar matches y calcular estadísticas
//       matches.forEach((match) => {
//         const isHomeTeam = match.homeTeam._id.toString() === teamId
//         const teamStats = isHomeTeam
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const opponentStats = isHomeTeam
//           ? match.teamStatistics.visitor
//           : match.teamStatistics.local

//         statistics.forEach((statistic) => {
//           const statValue = teamStats[statistic]
//           const receivedValue = opponentStats[statistic]

//           // Verificar si stats[statistic] está definido antes de acceder a sus propiedades
//           if (stats[statistic]) {
//             stats[statistic].scored.total += statValue
//             stats[statistic].scored.values.push(statValue)
//             stats[statistic].received.total += receivedValue
//             stats[statistic].received.values.push(receivedValue)
//             stats[statistic].total.total += statValue + receivedValue
//             stats[statistic].total.values.push(receivedValue)

//             Object.keys(stats[statistic].total.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))

//                 // Update overRanges and underRanges for total
//                 if (stats[statistic].total.overRanges[rangeKey]) {
//                   if (statValue + receivedValue >= range) {
//                     stats[statistic].total.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].total.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//             Object.keys(stats[statistic].scored.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))
//                 // Update overRanges and underRanges for scored
//                 if (stats[statistic].scored.overRanges[rangeKey]) {
//                   if (statValue >= range) {
//                     stats[statistic].scored.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].scored.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//             Object.keys(stats[statistic].received.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))

//                 // Update overRanges and underRanges for received
//                 if (stats[statistic].received.overRanges[rangeKey]) {
//                   if (receivedValue >= range) {
//                     stats[statistic].received.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].received.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//           } else {
//             console.error(`No se encontró stats[${statistic}]`)
//           }
//         })
//       })

//       // Calcular porcentajes para overRanges y underRanges
//       statistics.forEach((statistic) => {
//         ['total', 'received', 'scored'].forEach((type) => {
//           const totalMatches = stats.matchesTotalFinished
//           const overRanges = stats[statistic][type].overRanges
//           const underRanges = stats[statistic][type].underRanges

//           Object.keys(overRanges).forEach((rangeKey) => {
//             if (overRanges[rangeKey]) {
//               const overCount = overRanges[rangeKey].count
//               const underCount = underRanges[rangeKey].count

//               overRanges[rangeKey].percentage =
//                 (overCount / totalMatches) * 100
//               underRanges[rangeKey].percentage =
//                 (underCount / totalMatches) * 100
//             }
//           })
//         })
//       })

//       return stats
//     }

//     const teamIdsSet = new Set()
//     matches.forEach((match) => {
//       teamIdsSet.add(match.homeTeam._id.toString())
//       teamIdsSet.add(match.awayTeam._id.toString())
//     })

//     const allTeamIds = Array.from(teamIdsSet)
//     const teamPromises = allTeamIds.map(async (teamId) => {
//       let teamMatches = matches.filter(
//         (match) =>
//           match.homeTeam._id.toString() === teamId ||
//           match.awayTeam._id.toString() === teamId
//       )

//       if (booleanHomeOnly && !booleanAwayOnly) {
//         teamMatches = teamMatches.filter(
//           (match) => match.homeTeam._id.toString() === teamId
//         )
//       } else if (!booleanHomeOnly && booleanAwayOnly) {
//         teamMatches = teamMatches.filter(
//           (match) => match.awayTeam._id.toString() === teamId
//         )
//       }

//       // Limitar la cantidad de partidos a analizar
//       if (matchesCount && matchesCount > 0) {
//         teamMatches = teamMatches.slice(0, matchesCount)
//       }

//       const stats = generateStats(teamMatches, statistics.split(','), teamId)

//       const team = await Team.findById(teamId)
//       return {
//         teamId,
//         team,
//         stats
//       }
//     })

//     const results = await Promise.all(teamPromises)

//     const allStats = results.map(({ teamId, team, stats }) => ({
//       team,
//       stats
//     }))

//     res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error fetching matches:', error)
//     res.status(500).send('An error occurred while fetching matches')
//   }
// }

// const getAllTeamsStats = async (req, res) => {
//   const {
//     season,
//     statistics, // Expected to be a string with multiple statistics separated by commas
//     matchesCount,
//     homeOnly = 'true',
//     awayOnly = 'true',
//     includeAllSeasonMatches = 'false' // Nuevo parámetro de consulta
//   } = req.query

//   try {
//     const booleanHomeOnly = homeOnly === 'true'
//     const booleanAwayOnly = awayOnly === 'true'
//     const booleanIncludeAllSeasonMatches = includeAllSeasonMatches === 'true'

//     const query = {
//       isFinished: true
//     }

//     if (season && !booleanIncludeAllSeasonMatches) {
//       query.seasonYear = season
//     }
//     let teamIds = []
//     if (booleanIncludeAllSeasonMatches && season) {
//       const seasonData = await Season.findById(season).populate('teams')
//       if (seasonData) {
//         teamIds = seasonData.teams.map((team) => team._id.toString())
//       }
//     }
//     console.log('teamIds', teamIds)

//     // if (booleanIncludeAllSeasonMatches && teamIds.length > 0) {
//     //   query.$or = [
//     //     { homeTeam: { $in: teamIds } },
//     //     { awayTeam: { $in: teamIds } }
//     //   ]
//     // }

//     // let teamIds = []
//     // if (season) {
//     //   const seasonData = await Season.findOne({ year: '2025' }).populate(
//     //     'teams'
//     //   )
//     //   console.log('seasonData', seasonData)

//     //   if (seasonData) {
//     //     teamIds = seasonData.teams.map((team) => team._id.toString())
//     //   }
//     // }

//     // console.log('teamIds', teamIds)
//     // if (teamIds.length > 0) {
//     //   query.$or = [
//     //     { homeTeam: { $in: teamIds } },
//     //     { awayTeam: { $in: teamIds } }
//     //   ]
//     // }
//     console.log('QUERY', query)
//     const matches = await Match.find(query)
//       .sort({ date: -1 })
//       .populate('homeTeam awayTeam')
//       .populate('seasonYear', 'year')

//     const determineRanges = ([start, end], step) => {
//       const ranges = {}
//       const precision = step === 1 ? 1 : 2

//       for (let i = start; i <= end; i += step) {
//         const rangeKey = i.toFixed(precision).replace('.', '_')
//         ranges[rangeKey] = { count: 0, percentage: 0 }
//       }
//       return ranges
//     }

//     const generateStats = (matches, statistics, teamId) => {
//       const stats = {
//         matchesTotalFinished: matches?.length || 0
//       }

//       if (!statistics || statistics.length === 0) {
//         console.error('No se proporcionaron estadísticas válidas.')
//         return stats
//       }

//       statistics.forEach((statistic) => {
//         stats[statistic] = {
//           total: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           },
//           received: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           },
//           scored: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           }
//         }

//         switch (statistic) {
//           case 'possession':
//             stats[statistic].received.overRanges = determineRanges([40.5, 99.5], 5)
//             stats[statistic].scored.overRanges = determineRanges([40.5, 99.5], 5)
//             break
//           case 'goals':
//             stats[statistic].received.overRanges = determineRanges([0.5, 6.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([0.5, 6.5], 1)
//             stats[statistic].total.overRanges = determineRanges([2.5, 11.5], 1)
//             break
//           case 'corners':
//             stats[statistic].total.overRanges = determineRanges([10.5, 20.5], 2)
//             stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
//             break
//           case 'offsides':
//             stats[statistic].total.overRanges = determineRanges([8.5, 16.5], 2)
//             stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
//             break
//           case 'yellowCards':
//             stats[statistic].total.overRanges = determineRanges([3.5, 8.5], 1)
//             stats[statistic].received.overRanges = determineRanges([1.5, 5.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([1.5, 5.5], 1)
//             break
//           case 'shots':
//             stats[statistic].total.overRanges = determineRanges([18.5, 30.5], 2)
//             stats[statistic].received.overRanges = determineRanges([7.5, 16.5], 2)
//             stats[statistic].scored.overRanges = determineRanges([7.5, 16.5], 2)
//             break
//           case 'shotsOnTarget':
//             stats[statistic].total.overRanges = determineRanges([5.5, 16.5], 2)
//             stats[statistic].received.overRanges = determineRanges([3.5, 8.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([3.5, 8.5], 1)
//             break
//           default:
//             break
//         }

//         ['total', 'received', 'scored'].forEach((type) => {
//           const overRanges = stats[statistic][type].overRanges
//           Object.keys(overRanges).forEach((rangeKey) => {
//             stats[statistic][type].underRanges[rangeKey] = {
//               count: 0,
//               percentage: 0
//             }
//           })
//         })
//       })

//       matches.forEach((match) => {
//         const isHomeTeam = match.homeTeam._id.toString() === teamId
//         const teamStats = isHomeTeam
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const opponentStats = isHomeTeam
//           ? match.teamStatistics.visitor
//           : match.teamStatistics.local

//         statistics.forEach((statistic) => {
//           const statValue = teamStats[statistic]
//           const receivedValue = opponentStats[statistic]

//           if (stats[statistic]) {
//             stats[statistic].scored.total += statValue
//             stats[statistic].scored.values.push(statValue)
//             stats[statistic].received.total += receivedValue
//             stats[statistic].received.values.push(receivedValue)
//             stats[statistic].total.total += statValue + receivedValue
//             stats[statistic].total.values.push(receivedValue)

//             Object.keys(stats[statistic].total.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))

//                 if (stats[statistic].total.overRanges[rangeKey]) {
//                   if (statValue + receivedValue >= range) {
//                     stats[statistic].total.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].total.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//             Object.keys(stats[statistic].scored.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))
//                 if (stats[statistic].scored.overRanges[rangeKey]) {
//                   if (statValue >= range) {
//                     stats[statistic].scored.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].scored.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//             Object.keys(stats[statistic].received.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))

//                 if (stats[statistic].received.overRanges[rangeKey]) {
//                   if (receivedValue >= range) {
//                     stats[statistic].received.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].received.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//           } else {
//             console.error(`No se encontró stats[${statistic}]`)
//           }
//         })
//       })

//       statistics.forEach((statistic) => {
//         ['total', 'received', 'scored'].forEach((type) => {
//           const totalMatches = stats.matchesTotalFinished
//           const overRanges = stats[statistic][type].overRanges
//           const underRanges = stats[statistic][type].underRanges

//           Object.keys(overRanges).forEach((rangeKey) => {
//             if (overRanges[rangeKey]) {
//               const overCount = overRanges[rangeKey].count
//               const underCount = underRanges[rangeKey].count

//               overRanges[rangeKey].percentage =
//                 (overCount / totalMatches) * 100
//               underRanges[rangeKey].percentage =
//                 (underCount / totalMatches) * 100
//             }
//           })
//         })
//       })

//       return stats
//     }

//     const teamIdsSet = new Set()
//     matches.forEach((match) => {
//       teamIdsSet.add(match.homeTeam._id.toString())
//       teamIdsSet.add(match.awayTeam._id.toString())
//     })

//     const allTeamIds = Array.from(teamIdsSet)
//     const teamPromises = allTeamIds.map(async (teamId) => {
//       let teamMatches = matches.filter(
//         (match) =>
//           match.homeTeam._id.toString() === teamId ||
//           match.awayTeam._id.toString() === teamId
//       )

//       if (booleanHomeOnly && !booleanAwayOnly) {
//         teamMatches = teamMatches.filter(
//           (match) => match.homeTeam._id.toString() === teamId
//         )
//       } else if (!booleanHomeOnly && booleanAwayOnly) {
//         teamMatches = teamMatches.filter(
//           (match) => match.awayTeam._id.toString() === teamId
//         )
//       }

//       if (matchesCount && matchesCount > 0) {
//         teamMatches = teamMatches.slice(0, matchesCount)
//       }

//       const stats = generateStats(teamMatches, statistics.split(','), teamId)

//       const team = await Team.findById(teamId)
//       return {
//         teamId,
//         team,
//         stats
//       }
//     })

//     const results = await Promise.all(teamPromises)

//     let allStats = results.map(({ team, stats }) => ({
//       team,
//       stats
//     }))
//     if (booleanIncludeAllSeasonMatches) {
//       allStats = allStats.filter(stat => teamIds.includes(stat.team._id.toString()))
//     }

//     return res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error fetching matches:', error)
//     res.status(500).send('An error occurred while fetching matches')
//   }
// }

// const getAllTeamsStats = async (req, res) => {
//   const {
//     season, // Could be a comma-separated string of season IDs
//     statistics, // Expected to be a string with multiple statistics separated by commas
//     matchesCount,
//     homeOnly = 'true',
//     awayOnly = 'true',
//     includeAllSeasonMatches = 'false' // Nuevo parámetro de consulta
//   } = req.query

//   try {
//     const booleanHomeOnly = homeOnly === 'true'
//     const booleanAwayOnly = awayOnly === 'true'
//     const booleanIncludeAllSeasonMatches = includeAllSeasonMatches === 'true'

//     const query = {
//       isFinished: true
//     }

//     let seasonIds = []
//     if (season) {
//       seasonIds = season.split(',')
//     }

//     const teamIds = []
//     if (booleanIncludeAllSeasonMatches && seasonIds.length > 0) {
//       const seasonsData = await Season.find({ _id: { $in: seasonIds } }).populate('teams')
//       seasonsData.forEach((seasonData) => {
//         if (seasonData && seasonData.teams) {
//           seasonData.teams.forEach((team) => {
//             teamIds.push(team._id.toString())
//           })
//         }
//       })
//     }

//     if (season && !booleanIncludeAllSeasonMatches) {
//       query.seasonYear = { $in: seasonIds }
//     }

//     console.log('teamIds', teamIds)

//     console.log('QUERY', query)
//     const matches = await Match.find(query)
//       .sort({ date: -1 })
//       .populate('homeTeam awayTeam')
//       .populate('seasonYear', 'year')

//     const determineRanges = ([start, end], step) => {
//       const ranges = {}
//       const precision = step === 1 ? 1 : 2

//       for (let i = start; i <= end; i += step) {
//         const rangeKey = i.toFixed(precision).replace('.', '_')
//         ranges[rangeKey] = { count: 0, percentage: 0 }
//       }
//       return ranges
//     }

//     const generateStats = (matches, statistics, teamId) => {
//       const stats = {
//         matchesTotalFinished: matches?.length || 0
//       }

//       if (!statistics || statistics.length === 0) {
//         console.error('No se proporcionaron estadísticas válidas.')
//         return stats
//       }

//       statistics.forEach((statistic) => {
//         stats[statistic] = {
//           total: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           },
//           received: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           },
//           scored: {
//             total: 0,
//             values: [],
//             overRanges: {},
//             underRanges: {}
//           }
//         }

//         switch (statistic) {
//           case 'possession':
//             stats[statistic].received.overRanges = determineRanges([40.5, 99.5], 5)
//             stats[statistic].scored.overRanges = determineRanges([40.5, 99.5], 5)
//             break
//           case 'goals':
//             stats[statistic].received.overRanges = determineRanges([0.5, 6.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([0.5, 6.5], 1)
//             stats[statistic].total.overRanges = determineRanges([2.5, 11.5], 1)
//             break
//           case 'corners':
//             stats[statistic].total.overRanges = determineRanges([10.5, 20.5], 2)
//             stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
//             break
//           case 'offsides':
//             stats[statistic].total.overRanges = determineRanges([8.5, 16.5], 2)
//             stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
//             break
//           case 'yellowCards':
//             stats[statistic].total.overRanges = determineRanges([3.5, 8.5], 1)
//             stats[statistic].received.overRanges = determineRanges([1.5, 5.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([1.5, 5.5], 1)
//             break
//           case 'shots':
//             stats[statistic].total.overRanges = determineRanges([18.5, 30.5], 2)
//             stats[statistic].received.overRanges = determineRanges([7.5, 16.5], 2)
//             stats[statistic].scored.overRanges = determineRanges([7.5, 16.5], 2)
//             break
//           case 'shotsOnTarget':
//             stats[statistic].total.overRanges = determineRanges([5.5, 16.5], 2)
//             stats[statistic].received.overRanges = determineRanges([3.5, 8.5], 1)
//             stats[statistic].scored.overRanges = determineRanges([3.5, 8.5], 1)
//             break
//           default:
//             break
//         }

//         ['total', 'received', 'scored'].forEach((type) => {
//           const overRanges = stats[statistic][type].overRanges
//           Object.keys(overRanges).forEach((rangeKey) => {
//             stats[statistic][type].underRanges[rangeKey] = {
//               count: 0,
//               percentage: 0
//             }
//           })
//         })
//       })

//       matches.forEach((match) => {
//         const isHomeTeam = match.homeTeam._id.toString() === teamId
//         const teamStats = isHomeTeam
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const opponentStats = isHomeTeam
//           ? match.teamStatistics.visitor
//           : match.teamStatistics.local

//         statistics.forEach((statistic) => {
//           const statValue = teamStats[statistic]
//           const receivedValue = opponentStats[statistic]

//           if (stats[statistic]) {
//             stats[statistic].scored.total += statValue
//             stats[statistic].scored.values.push(statValue)
//             stats[statistic].received.total += receivedValue
//             stats[statistic].received.values.push(receivedValue)
//             stats[statistic].total.total += statValue + receivedValue
//             stats[statistic].total.values.push(receivedValue)

//             Object.keys(stats[statistic].total.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))

//                 if (stats[statistic].total.overRanges[rangeKey]) {
//                   if (statValue + receivedValue >= range) {
//                     stats[statistic].total.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].total.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//             Object.keys(stats[statistic].scored.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))
//                 if (stats[statistic].scored.overRanges[rangeKey]) {
//                   if (statValue >= range) {
//                     stats[statistic].scored.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].scored.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//             Object.keys(stats[statistic].received.overRanges).forEach(
//               (rangeKey) => {
//                 const range = parseFloat(rangeKey.replace('_', '.'))

//                 if (stats[statistic].received.overRanges[rangeKey]) {
//                   if (receivedValue >= range) {
//                     stats[statistic].received.overRanges[rangeKey].count++
//                   } else {
//                     stats[statistic].received.underRanges[rangeKey].count++
//                   }
//                 }
//               }
//             )
//           } else {
//             console.error(`No se encontró stats[${statistic}]`)
//           }
//         })
//       })

//       statistics.forEach((statistic) => {
//         ['total', 'received', 'scored'].forEach((type) => {
//           const totalMatches = stats.matchesTotalFinished
//           const overRanges = stats[statistic][type].overRanges
//           const underRanges = stats[statistic][type].underRanges

//           Object.keys(overRanges).forEach((rangeKey) => {
//             if (overRanges[rangeKey]) {
//               const overCount = overRanges[rangeKey].count
//               const underCount = underRanges[rangeKey].count

//               overRanges[rangeKey].percentage =
//                 (overCount / totalMatches) * 100
//               underRanges[rangeKey].percentage =
//                 (underCount / totalMatches) * 100
//             }
//           })
//         })
//       })

//       return stats
//     }

//     const teamIdsSet = new Set()
//     matches.forEach((match) => {
//       teamIdsSet.add(match.homeTeam._id.toString())
//       teamIdsSet.add(match.awayTeam._id.toString())
//     })

//     const allTeamIds = Array.from(teamIdsSet)
//     const teamPromises = allTeamIds.map(async (teamId) => {
//       let teamMatches = matches.filter(
//         (match) =>
//           match.homeTeam._id.toString() === teamId ||
//           match.awayTeam._id.toString() === teamId
//       )

//       if (booleanHomeOnly && !booleanAwayOnly) {
//         teamMatches = teamMatches.filter(
//           (match) => match.homeTeam._id.toString() === teamId
//         )
//       } else if (!booleanHomeOnly && booleanAwayOnly) {
//         teamMatches = teamMatches.filter(
//           (match) => match.awayTeam._id.toString() === teamId
//         )
//       }

//       if (matchesCount && matchesCount > 0) {
//         teamMatches = teamMatches.slice(0, matchesCount)
//       }

//       const stats = generateStats(teamMatches, statistics.split(','), teamId)

//       const team = await Team.findById(teamId)
//       return {
//         teamId,
//         team,
//         stats
//       }
//     })

//     const results = await Promise.all(teamPromises)

//     let allStats = results.map(({ team, stats }) => ({
//       team,
//       stats
//     }))
//     if (booleanIncludeAllSeasonMatches) {
//       allStats = allStats.filter(stat => teamIds.includes(stat.team._id.toString()))
//     }

//     return res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error fetching matches:', error)
//     res.status(500).send('An error occurred while fetching matches')
//   }
// }
const getAllTeamsStats = async (req, res) => {
  const {
    season, // Could be a comma-separated string of season IDs
    statistics, // Expected to be a string with multiple statistics separated by commas
    matchesCount,
    homeOnly = 'true',
    awayOnly = 'true',
    includeAllSeasonMatches = 'false' // Nuevo parámetro de consulta
  } = req.query

  try {
    const booleanHomeOnly = homeOnly === 'true'
    const booleanAwayOnly = awayOnly === 'true'
    const booleanIncludeAllSeasonMatches = includeAllSeasonMatches === 'true'

    const query = {
      isFinished: true
    }

    let seasonIds = []
    console.log('season:', season)
    if (season) {
      seasonIds = season.split(',')
    }

    const teamIds = []
    let seasonsData = []
    if (booleanIncludeAllSeasonMatches && seasonIds.length > 0) {
      seasonsData = await Season.find({ _id: { $in: seasonIds } }).populate(
        'teams league'
      )
      seasonsData.forEach((seasonData) => {
        if (seasonData && seasonData.teams) {
          seasonData.teams.forEach((team) => {
            teamIds.push(team._id.toString())
          })
        }
      })
    }

    if (season && !booleanIncludeAllSeasonMatches) {
      query.seasonYear = { $in: seasonIds }
    }

    console.log('teamIds', teamIds)

    console.log('QUERY', query)
    const matches = await Match.find(query)
      .sort({ date: -1 })
      .populate('homeTeam awayTeam')
      .populate('seasonYear', 'year')
      .populate({
        path: 'seasonYear',
        populate: {
          path: 'league',
          model: 'League'
        }
      })

    const determineRanges = ([start, end], step) => {
      const ranges = {}
      const precision = step === 1 ? 1 : 2

      for (let i = start; i <= end; i += step) {
        const rangeKey = i.toFixed(precision).replace('.', '_')
        ranges[rangeKey] = { count: 0, percentage: 0 }
      }
      return ranges
    }

    const generateStats = (matches, statistics, teamId) => {
      const stats = {
        matchesTotalFinished: matches?.length || 0
      }

      if (!statistics || statistics.length === 0) {
        console.error('No se proporcionaron estadísticas válidas.')
        return stats
      }

      statistics.forEach((statistic) => {
        stats[statistic] = {
          total: {
            total: 0,
            values: [],
            overRanges: {},
            underRanges: {}
          },
          received: {
            total: 0,
            values: [],
            overRanges: {},
            underRanges: {}
          },
          scored: {
            total: 0,
            values: [],
            overRanges: {},
            underRanges: {}
          }
        }

        switch (statistic) {
          case 'possession':
            stats[statistic].received.overRanges = determineRanges(
              [40.5, 99.5],
              5
            )
            stats[statistic].scored.overRanges = determineRanges(
              [40.5, 99.5],
              5
            )
            break
          case 'goals':
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 6.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges([0.5, 6.5], 1)
            stats[statistic].total.overRanges = determineRanges([2.5, 11.5], 1)
            break
          case 'corners':
            stats[statistic].total.overRanges = determineRanges(
              [10.5, 20.5],
              2
            )
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 8.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges([0.5, 8.5], 1)
            break
          case 'offsides':
            stats[statistic].total.overRanges = determineRanges([0.5, 9.5], 2)
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 4.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges([0.5, 45], 1)
            break
          case 'yellowCards':
            stats[statistic].total.overRanges = determineRanges([3.5, 8.5], 1)
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 5.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges([0.5, 5.5], 1)
            break
          case 'shots':
            stats[statistic].total.overRanges = determineRanges(
              [18.5, 30.5],
              2
            )
            stats[statistic].received.overRanges = determineRanges(
              [7.5, 16.5],
              2
            )
            stats[statistic].scored.overRanges = determineRanges(
              [7.5, 16.5],
              2
            )
            break
          case 'shotsOnTarget':
            stats[statistic].total.overRanges = determineRanges([5.5, 16.5], 2)
            stats[statistic].received.overRanges = determineRanges(
              [3.5, 8.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges([3.5, 8.5], 1)
            break
          case 'foults':
            stats[statistic].total.overRanges = determineRanges([5.5, 16.5], 2)
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 8.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges([3.5, 8.5], 1)
            break
          default:
            break
        }
        // foults
        ['total', 'received', 'scored'].forEach((type) => {
          const overRanges = stats[statistic][type].overRanges
          Object.keys(overRanges).forEach((rangeKey) => {
            stats[statistic][type].underRanges[rangeKey] = {
              count: 0,
              percentage: 0
            }
          })
        })
      })

      matches.forEach((match) => {
        const isHomeTeam = match.homeTeam._id.toString() === teamId
        const teamStats = isHomeTeam
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const opponentStats = isHomeTeam
          ? match.teamStatistics.visitor
          : match.teamStatistics.local

        statistics.forEach((statistic) => {
          const statValue = teamStats[statistic]
          const receivedValue = opponentStats[statistic]

          if (stats[statistic]) {
            stats[statistic].scored.total += statValue
            stats[statistic].scored.values.push(statValue)
            stats[statistic].received.total += receivedValue
            stats[statistic].received.values.push(receivedValue)
            stats[statistic].total.total += statValue + receivedValue
            stats[statistic].total.values.push(receivedValue)

            Object.keys(stats[statistic].total.overRanges).forEach(
              (rangeKey) => {
                const range = parseFloat(rangeKey.replace('_', '.'))

                if (stats[statistic].total.overRanges[rangeKey]) {
                  if (statValue + receivedValue >= range) {
                    stats[statistic].total.overRanges[rangeKey].count++
                  } else {
                    stats[statistic].total.underRanges[rangeKey].count++
                  }
                }
              }
            )
            Object.keys(stats[statistic].scored.overRanges).forEach(
              (rangeKey) => {
                const range = parseFloat(rangeKey.replace('_', '.'))
                if (stats[statistic].scored.overRanges[rangeKey]) {
                  if (statValue >= range) {
                    stats[statistic].scored.overRanges[rangeKey].count++
                  } else {
                    stats[statistic].scored.underRanges[rangeKey].count++
                  }
                }
              }
            )
            Object.keys(stats[statistic].received.overRanges).forEach(
              (rangeKey) => {
                const range = parseFloat(rangeKey.replace('_', '.'))

                if (stats[statistic].received.overRanges[rangeKey]) {
                  if (receivedValue >= range) {
                    stats[statistic].received.overRanges[rangeKey].count++
                  } else {
                    stats[statistic].received.underRanges[rangeKey].count++
                  }
                }
              }
            )
          } else {
            console.error(`No se encontró stats[${statistic}]`)
          }
        })
      })

      statistics.forEach((statistic) => {
        ['total', 'received', 'scored'].forEach((type) => {
          const totalMatches = stats.matchesTotalFinished
          const overRanges = stats[statistic][type].overRanges
          const underRanges = stats[statistic][type].underRanges

          Object.keys(overRanges).forEach((rangeKey) => {
            if (overRanges[rangeKey]) {
              const overCount = overRanges[rangeKey].count
              const underCount = underRanges[rangeKey].count

              overRanges[rangeKey].percentage = (
                (overCount / totalMatches) *
                100
              ).toFixed(2)
              underRanges[rangeKey].percentage = (
                (underCount / totalMatches) *
                100
              ).toFixed(2)
            }
          })
        })
      })

      return stats
    }

    const teamIdsSet = new Set()
    matches.forEach((match) => {
      teamIdsSet.add(match.homeTeam._id.toString())
      teamIdsSet.add(match.awayTeam._id.toString())
    })

    const allTeamIds = Array.from(teamIdsSet)

    const teamPromises = allTeamIds.map(async (teamId) => {
      let teamMatches = matches.filter(
        (match) =>
          match.homeTeam._id.toString() === teamId ||
          match.awayTeam._id.toString() === teamId
      )

      if (booleanHomeOnly && !booleanAwayOnly) {
        teamMatches = teamMatches.filter(
          (match) => match.homeTeam._id.toString() === teamId
        )
      } else if (!booleanHomeOnly && booleanAwayOnly) {
        teamMatches = teamMatches.filter(
          (match) => match.awayTeam._id.toString() === teamId
        )
      }

      if (matchesCount && matchesCount > 0) {
        teamMatches = teamMatches.slice(0, matchesCount)
      }

      const stats = generateStats(teamMatches, statistics.split(','), teamId)

      const team = await Team.findById(teamId)
      // Obtener la temporada y la liga para el equipo
      // Obtener la temporada y la liga para el equipo
      const seasonData = teamMatches
        .map((match) => ({
          season: match.seasonYear.year,
          league: match.seasonYear.league.name,
          seasonId: match.seasonYear._id.toString()
        }))
        .filter((season) => seasonIds.includes(season.seasonId))

      const setSeasonData = new Set(seasonData.map((s) => s.league))
      const leaguesString = Array.from(setSeasonData).join(', ')

      return {
        teamId,
        team,
        seasonData: leaguesString,
        stats
      }
    })

    const results = await Promise.all(teamPromises)

    let allStats = results.map(({ team, stats, seasonData }) => ({
      team: {
        ...team.toObject(),
        season: seasonData.season,
        league: seasonData
      },
      stats
    }))
    if (booleanIncludeAllSeasonMatches) {
      allStats = allStats.filter((stat) =>
        teamIds.includes(stat.team._id.toString())
      )
    }

    return res.status(200).json(allStats)
  } catch (error) {
    console.error('Error fetching matches:', error)
    res.status(500).send('An error occurred while fetching matches0000')
  }
}

const getZoneIdByTeam = async (idTeam, seasonId) => {
  try {
    const season = await Season.findById(seasonId).populate('zones')
    if (!season) {
      throw new Error(`Season with ID ${seasonId} not found`)
    }

    for (const zone of season.zones) {
      if (zone.teams.includes(idTeam)) {
        return zone._id
      }
    }
    return null
  } catch (error) {
    console.error('Error getting zone ID by team:', error)
    throw error
  }
}

// const getTeamStatsForSeason = async (req, res) => {
//   const { seasonId } = req.params
//   const { matchType = 'both', teamId, matchLimit } = req.query
//   const seasonIdArray = seasonId.split(',')

//   try {
//     const matchFilter = {
//       seasonYear: { $in: seasonIdArray },
//       isFinished: true
//     }

//     if (teamId) {
//       matchFilter.$or = [
//         { 'homeTeam._id': teamId },
//         { 'awayTeam._id': teamId }
//       ]
//     }

//     let matches = await Match.find(matchFilter)
//       .populate('homeTeam awayTeam')
//       .sort({ date: -1 })
//     console.log('matchFilter', matchFilter)
//     if (matchLimit) {
//       const selectedMatches = new Set() // Set para evitar duplicados

//       const teamMatches = {}

//       matches.forEach((match) => {
//         const homeTeamId = match.homeTeam._id.toString()
//         const awayTeamId = match.awayTeam._id.toString()

//         if (!teamMatches[homeTeamId]) {
//           teamMatches[homeTeamId] = []
//         }
//         if (!teamMatches[awayTeamId]) {
//           teamMatches[awayTeamId] = []
//         }

//         // Asegurarse de que no se duplican los partidos en el límite
//         if (teamMatches[homeTeamId].length < matchLimit && !selectedMatches.has(match._id.toString())) {
//           teamMatches[homeTeamId].push(match)
//           selectedMatches.add(match._id.toString())
//         }
//         if (teamMatches[awayTeamId].length < matchLimit && !selectedMatches.has(match._id.toString())) {
//           teamMatches[awayTeamId].push(match)
//           selectedMatches.add(match._id.toString())
//         }
//       })

//       matches = Array.from(selectedMatches).map(id => matches.find(match => match._id.toString() === id))
//     }

//     const teamStats = {}

//     const initializeTeamStats = (teamName, country) => ({
//       team: teamName,
//       country,
//       statistics: {
//         goals: { values: [], total: 0 },
//         offsides: { values: [], total: 0 },
//         yellowCards: { values: [], total: 0 },
//         redCards: { values: [], total: 0 },
//         corners: { values: [], total: 0 },
//         shots: { values: [], total: 0 },
//         shotsOnTarget: { values: [], total: 0 },
//         possession: { values: [], total: 0 },
//         foults: { values: [], total: 0 }
//       },
//       received: {
//         goals: { values: [], total: 0 },
//         offsides: { values: [], total: 0 },
//         yellowCards: { values: [], total: 0 },
//         redCards: { values: [], total: 0 },
//         corners: { values: [], total: 0 },
//         shots: { values: [], total: 0 },
//         shotsOnTarget: { values: [], total: 0 },
//         possession: { values: [], total: 0 },
//         foults: { values: [], total: 0 }
//       }
//     })
//     console.log('PARTIDOS++', matches)
//     matches.forEach((match) => {
//       // Procesar estadísticas del equipo local
//       if (matchType === 'home' || matchType === 'both') {
//         const homeTeamId = match.homeTeam._id.toString()
//         const homeTeamName = match.homeTeam.name
//         const homeTeamCountry = match.homeTeam.country
//         if (!teamStats[homeTeamId]) {
//           teamStats[homeTeamId] = initializeTeamStats(homeTeamName, homeTeamCountry)
//         }
//         processStats(match.teamStatistics.local, match.teamStatistics.visitor, teamStats[homeTeamId])
//       }

//       // Procesar estadísticas del equipo visitante
//       if (matchType === 'away' || matchType === 'both') {
//         const awayTeamId = match.awayTeam._id.toString()
//         const awayTeamName = match.awayTeam.name
//         const awayTeamCountry = match.awayTeam.country

//         if (!teamStats[awayTeamId]) {
//           teamStats[awayTeamId] = initializeTeamStats(awayTeamName, awayTeamCountry)
//         }
//         processStats(match.teamStatistics.visitor, match.teamStatistics.local, teamStats[awayTeamId])
//       }
//     })

//     const calculateStats = (values) => {
//       if (values.length === 0) return { promedio: 0, mediana: 0, desviacion: 0 }

//       const promedio = parseFloat(ss.mean(values).toFixed(1))
//       const mediana = parseFloat(ss.median(values).toFixed(1))
//       const desviacion = parseFloat(ss.standardDeviation(values).toFixed(1))

//       return { promedio, mediana, desviacion }
//     }

//     Object.values(teamStats).forEach((team) => {
//       Object.keys(team.statistics).forEach((statKey) => {
//         team.statistics[statKey] = {
//           ...team.statistics[statKey],
//           ...calculateStats(team.statistics[statKey].values)
//         }
//         team.received[statKey] = {
//           ...team.received[statKey],
//           ...calculateStats(team.received[statKey].values)
//         }
//       })
//     })

//     const teamStatsArray = Object.keys(teamStats).map((teamId) => ({
//       teamId,
//       country: teamStats[teamId].country,
//       teamName: teamStats[teamId].team,
//       statistics: teamStats[teamId].statistics,
//       received: teamStats[teamId].received
//     }))

//     res.json(teamStatsArray)
//   } catch (error) {
//     console.error('Error fetching team statistics for season:', error)
//     res.status(500).json({
//       error: 'An error occurred while fetching team statistics for season'
//     })
//   }
// }

// Función auxiliar para procesar estadísticas y evitar duplicaciones

// const getTeamStatsForSeason = async (req, res) => {
//   const { seasonId } = req.params
//   const { matchType = 'both', teamId, matchLimit } = req.query
//   const seasonIdArray = seasonId.split(',')

//   try {
//     // 1. Filtrar partidos por temporadas y equipo (si se proporciona)
//     const matchFilter = {
//       seasonYear: { $in: seasonIdArray },
//       isFinished: true
//     }

//     if (teamId) {
//       matchFilter.$or = [
//         { 'homeTeam._id': teamId },
//         { 'awayTeam._id': teamId }
//       ]
//     }

//     const matches = await Match.find(matchFilter)
//       .populate('homeTeam awayTeam')
//       .sort({ date: -1 })

//     // 2. Agrupar partidos por equipo
//     const teamMatches = {}

//     matches.forEach(match => {
//       const homeTeamId = match.homeTeam._id.toString()
//       const awayTeamId = match.awayTeam._id.toString()

//       if (!teamMatches[homeTeamId]) {
//         teamMatches[homeTeamId] = []
//       }
//       if (!teamMatches[awayTeamId]) {
//         teamMatches[awayTeamId] = []
//       }

//       teamMatches[homeTeamId].push(match)
//       teamMatches[awayTeamId].push(match)
//     })

//     // 3. Aplicar el límite de partidos por equipo
//     if (matchLimit) {
//       Object.keys(teamMatches).forEach(teamId => {
//         teamMatches[teamId] = teamMatches[teamId].slice(0, matchLimit)
//       })
//     }

//     // 4. Calcular las estadísticas por equipo
//     const teamStats = {}

//     const initializeTeamStats = (teamName, country) => ({
//       team: teamName,
//       country,
//       statistics: {
//         goals: { values: [], total: 0 },
//         offsides: { values: [], total: 0 },
//         yellowCards: { values: [], total: 0 },
//         redCards: { values: [], total: 0 },
//         corners: { values: [], total: 0 },
//         shots: { values: [], total: 0 },
//         shotsOnTarget: { values: [], total: 0 },
//         possession: { values: [], total: 0 },
//         foults: { values: [], total: 0 }
//       },
//       received: {
//         goals: { values: [], total: 0 },
//         offsides: { values: [], total: 0 },
//         yellowCards: { values: [], total: 0 },
//         redCards: { values: [], total: 0 },
//         corners: { values: [], total: 0 },
//         shots: { values: [], total: 0 },
//         shotsOnTarget: { values: [], total: 0 },
//         possession: { values: [], total: 0 },
//         foults: { values: [], total: 0 }
//       }
//     })

//     Object.keys(teamMatches).forEach(teamId => {
//       const matches = teamMatches[teamId]
//       if (matches.length === 0) return

//       const teamName = matches[0].homeTeam._id.toString() === teamId
//         ? matches[0].homeTeam.name
//         : matches[0].awayTeam.name
//       const teamCountry = matches[0].homeTeam._id.toString() === teamId
//         ? matches[0].homeTeam.country
//         : matches[0].awayTeam.country

//       if (!teamStats[teamId]) {
//         teamStats[teamId] = initializeTeamStats(teamName, teamCountry)
//       }

//       matches.forEach(match => {
//         if (matchType === 'home' || matchType === 'both') {
//           if (match.homeTeam._id.toString() === teamId) {
//             processStats(match.teamStatistics.local, match.teamStatistics.visitor, teamStats[teamId])
//           }
//         }
//         if (matchType === 'away' || matchType === 'both') {
//           if (match.awayTeam._id.toString() === teamId) {
//             processStats(match.teamStatistics.visitor, match.teamStatistics.local, teamStats[teamId])
//           }
//         }
//       })
//     })

//     // 5. Preparar y devolver el resultado
//     const calculateStats = values => {
//       if (values.length === 0) return { promedio: 0, mediana: 0, desviacion: 0 }

//       const promedio = parseFloat(ss.mean(values).toFixed(1))
//       const mediana = parseFloat(ss.median(values).toFixed(1))
//       const desviacion = parseFloat(ss.standardDeviation(values).toFixed(1))

//       return { promedio, mediana, desviacion }
//     }

//     Object.values(teamStats).forEach(team => {
//       Object.keys(team.statistics).forEach(statKey => {
//         team.statistics[statKey] = {
//           ...team.statistics[statKey],
//           ...calculateStats(team.statistics[statKey].values)
//         }
//         team.received[statKey] = {
//           ...team.received[statKey],
//           ...calculateStats(team.received[statKey].values)
//         }
//       })
//     })

//     const teamStatsArray = Object.keys(teamStats).map(teamId => ({
//       teamId,
//       country: teamStats[teamId].country,
//       teamName: teamStats[teamId].team,
//       statistics: teamStats[teamId].statistics,
//       received: teamStats[teamId].received
//     }))

//     res.json(teamStatsArray)
//   } catch (error) {
//     console.error('Error fetching team statistics for season:', error)
//     res.status(500).json({
//       error: 'An error occurred while fetching team statistics for season'
//     })
//   }
// }

// const processStats = (teamStatsSource, teamStatsReceived, teamStatsObj) => {
//   const statsKeys = [
//     'goals', 'offsides', 'yellowCards', 'redCards', 'corners',
//     'shots', 'shotsOnTarget', 'possession', 'foults'
//   ]

//   statsKeys.forEach(statKey => {
//     teamStatsObj.statistics[statKey].values.push(teamStatsSource[statKey] || 0)
//     teamStatsObj.statistics[statKey].total += teamStatsSource[statKey] || 0

//     teamStatsObj.received[statKey].values.push(teamStatsReceived[statKey] || 0)
//     teamStatsObj.received[statKey].total += teamStatsReceived[statKey] || 0
//   })
// }

const getTeamStatsForSeason = async (req, res) => {
  const { seasonId } = req.params
  const { matchType = 'both', teamId, matchLimit } = req.query
  const seasonIdArray = seasonId.split(',')

  try {
    // 1. Filtrar partidos por temporadas y equipo (si se proporciona)
    const matchFilter = {
      seasonYear: { $in: seasonIdArray },
      isFinished: true
    }

    if (teamId) {
      matchFilter.$or = [
        { 'homeTeam._id': teamId },
        { 'awayTeam._id': teamId }
      ]
    }

    const matches = await Match.find(matchFilter)
      .populate('homeTeam awayTeam')
      .sort({ date: -1 })

    // 2. Agrupar partidos por equipo
    const teamMatches = {}

    matches.forEach(match => {
      const homeTeamId = match.homeTeam._id.toString()
      const awayTeamId = match.awayTeam._id.toString()

      if (!teamMatches[homeTeamId]) {
        teamMatches[homeTeamId] = []
      }
      if (!teamMatches[awayTeamId]) {
        teamMatches[awayTeamId] = []
      }

      // Filtrar por tipo de partido antes de agregar a la lista del equipo
      if (matchType === 'both' || matchType === 'home') {
        teamMatches[homeTeamId].push(match)
      }
      if (matchType === 'both' || matchType === 'away') {
        teamMatches[awayTeamId].push(match)
      }
    })

    // 3. Aplicar el límite de partidos por equipo después de filtrar por tipo
    if (matchLimit) {
      Object.keys(teamMatches).forEach(teamId => {
        teamMatches[teamId] = teamMatches[teamId].slice(0, matchLimit)
      })
    }

    // 4. Calcular las estadísticas por equipo
    const teamStats = {}

    const initializeTeamStats = (teamName, country) => ({
      team: teamName,
      country,
      statistics: {
        goals: { values: [], total: 0 },
        offsides: { values: [], total: 0 },
        yellowCards: { values: [], total: 0 },
        redCards: { values: [], total: 0 },
        corners: { values: [], total: 0 },
        shots: { values: [], total: 0 },
        shotsOnTarget: { values: [], total: 0 },
        possession: { values: [], total: 0 },
        foults: { values: [], total: 0 }
      },
      received: {
        goals: { values: [], total: 0 },
        offsides: { values: [], total: 0 },
        yellowCards: { values: [], total: 0 },
        redCards: { values: [], total: 0 },
        corners: { values: [], total: 0 },
        shots: { values: [], total: 0 },
        shotsOnTarget: { values: [], total: 0 },
        possession: { values: [], total: 0 },
        foults: { values: [], total: 0 }
      }
    })

    Object.keys(teamMatches).forEach(teamId => {
      const matches = teamMatches[teamId]
      if (matches.length === 0) return

      const teamName = matches[0].homeTeam._id.toString() === teamId
        ? matches[0].homeTeam.name
        : matches[0].awayTeam.name
      const teamCountry = matches[0].homeTeam._id.toString() === teamId
        ? matches[0].homeTeam.country
        : matches[0].awayTeam.country

      if (!teamStats[teamId]) {
        teamStats[teamId] = initializeTeamStats(teamName, teamCountry)
      }

      matches.forEach(match => {
        if (matchType === 'home' || matchType === 'both') {
          if (match.homeTeam._id.toString() === teamId) {
            processStats(match.teamStatistics.local, match.teamStatistics.visitor, teamStats[teamId])
          }
        }
        if (matchType === 'away' || matchType === 'both') {
          if (match.awayTeam._id.toString() === teamId) {
            processStats(match.teamStatistics.visitor, match.teamStatistics.local, teamStats[teamId])
          }
        }
      })
    })

    // 5. Preparar y devolver el resultado
    const calculateStats = values => {
      if (values.length === 0) return { promedio: 0, mediana: 0, desviacion: 0 }

      const promedio = parseFloat(ss.mean(values).toFixed(1))
      const mediana = parseFloat(ss.median(values).toFixed(1))
      const desviacion = parseFloat(ss.standardDeviation(values).toFixed(1))

      return { promedio, mediana, desviacion }
    }

    Object.values(teamStats).forEach(team => {
      Object.keys(team.statistics).forEach(statKey => {
        team.statistics[statKey] = {
          ...team.statistics[statKey],
          ...calculateStats(team.statistics[statKey].values)
        }
        team.received[statKey] = {
          ...team.received[statKey],
          ...calculateStats(team.received[statKey].values)
        }
      })
    })

    const teamStatsArray = Object.keys(teamStats).map(teamId => ({
      teamId,
      country: teamStats[teamId].country,
      teamName: teamStats[teamId].team,
      statistics: teamStats[teamId].statistics,
      received: teamStats[teamId].received
    }))

    res.json(teamStatsArray)
  } catch (error) {
    console.error('Error fetching team statistics for season:', error)
    res.status(500).json({
      error: 'An error occurred while fetching team statistics for season'
    })
  }
}

const processStats = (teamStatsSource, teamStatsReceived, teamStatsObj) => {
  const statsKeys = [
    'goals', 'offsides', 'yellowCards', 'redCards', 'corners',
    'shots', 'shotsOnTarget', 'possession', 'foults'
  ]

  statsKeys.forEach(statKey => {
    teamStatsObj.statistics[statKey].values.push(teamStatsSource[statKey] || 0)
    teamStatsObj.statistics[statKey].total += teamStatsSource[statKey] || 0

    teamStatsObj.received[statKey].values.push(teamStatsReceived[statKey] || 0)
    teamStatsObj.received[statKey].total += teamStatsReceived[statKey] || 0
  })
}

const deleteMatchById = async (req, res) => {
  try {
    const matchId = req.params.id

    // Buscar y eliminar el partido por su _id
    const deletedMatch = await Match.findByIdAndDelete(matchId)

    if (!deletedMatch) {
      return res.status(404).send('Partido no encontrado')
    }

    res.status(200).send('Partido eliminado correctamente')
  } catch (error) {
    console.error('Error deleting match by ID:', error)
    res.status(500).send('An error occurred while deleting match by ID')
  }
}

// Controlador para actualizar un partido por su ID
const updateMatchById = async (req, res) => {
  try {
    const matchId = req.params.id
    const {
      homeTeamName,
      awayTeamName,
      date,
      league,
      seasonYear,
      round,
      country,
      goalsHome,
      goalsAway,
      isFinished
    } = req.body

    // Primero, construyes el objeto de actualización con los campos que deseas modificar
    const updateFields = {
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      date,
      league,
      seasonYear,
      round,
      country,
      goalsHome,
      goalsAway,
      isFinished
    }

    // Luego, utilizas findByIdAndUpdate para buscar y actualizar el partido por su ID
    // El tercer parámetro opcional configura la opción 'new' como true para devolver el documento actualizado
    const updatedMatch = await Match.findByIdAndUpdate(matchId, updateFields, {
      new: true
    })

    if (!updatedMatch) {
      return res.status(404).send('Partido no encontrado')
    }

    res.status(200).send(updatedMatch)
  } catch (error) {
    console.error('Error updating match by ID:', error)
    res.status(500).send('An error occurred while updating match by ID')
  }
}

const getTeamStatsNew = async (req, res) => {
  const {
    // ID del equipo para el que se quieren obtener estadísticas
    season, // Could be a comma-separated string of season IDs
    statistics, // Expected to be a string with multiple statistics separated by commas
    matchesCount,
    homeOnly = 'true',
    awayOnly = 'true',
    currentSeason = 'true',
    includeAllSeasonMatches = 'false', // Nuevo parámetro de consulta
    position = 'false'
  } = req.query
  const { teamId } = req.params
  console.log('matchesCount+++', matchesCount)
  try {
    const booleanHomeOnly = homeOnly === 'true'
    const booleanAwayOnly = awayOnly === 'true'
    const booleanCurrentSeason = currentSeason === 'true'

    const booleanIncludeAllSeasonMatches = includeAllSeasonMatches === 'true'
    const booleanPosition = position !== 'false'

    // const query = {
    //   isFinished: true
    // }

    const query = {
      isFinished: true,
      $or: [{ homeTeam: teamId }, { awayTeam: teamId }]
    }

    let seasonIds = []
    if (season) {
      seasonIds = season.split(',')
    }

    if (season && !booleanIncludeAllSeasonMatches) {
      query.seasonYear = { $in: seasonIds }
    }

    const getTeamsInRange = (zoneTables, start, end) => {
      const teamsInRange = []

      zoneTables.forEach((zone) => {
        const zoneTeams = zone.teams

        // Asegúrate de que los índices no se salgan del rango
        const validStart = Math.max(0, start - 1) // Convertir a índice de array (0-based)
        const validEnd = Math.min(zoneTeams.length, end)

        // Obtener los equipos en el rango y extraer sus IDs
        const teamsInZoneRange = zoneTeams
          .slice(validStart, validEnd)
          .map((teamData) => teamData.team.toString())

        teamsInRange.push(...teamsInZoneRange)
      })

      return teamsInRange
    }
    const getTeamsInRangeFromSingleTable = (teamsTable, start, end) => {
      // Asegúrate de que los índices no se salgan del rango
      const validStart = Math.max(0, start - 1) // Convertir a índice de array (0-based)
      const validEnd = Math.min(teamsTable.length, end)

      // Obtener los equipos en el rango y extraer sus IDs
      const teamsInRange = teamsTable
        .slice(validStart, validEnd)
        .map(teamData => teamData.team.toString())

      return teamsInRange
    }

    if (booleanPosition && seasonIds.length === 1) {
      const [start, end] = position.split('-').map(Number)
      const seasonId = seasonIds[0]
      const zoneId = await getZoneIdByTeam(teamId, seasonId)
      console.log('start, end', start, end, zoneId)
      let teamsInRange = []
      const matcheForPositionTable = await Match.find({
        seasonYear: seasonIds,
        isFinished: true
      })
      // EQUIPOS DE LA TEMPORADA y COUNTRY
      const allStats = calculateStatsTable(
        matcheForPositionTable,
        'Argentina'
      )

      const populatedStandings = allStats.map((teamData) => ({
        team: teamData.team,
        allStats: teamData.allStats,
        statsHome: teamData.statsHome,
        statsVisitor: teamData.statsVisitor
      }))
      if (zoneId) {
        const zoneTables = []
        const season = await Season.findById(seasonId)
          .populate('zones')
          .populate('league')

        if (
          season.zones &&
          Array.isArray(season.zones) &&
          season.zones.length > 0
        ) {
          for (const zone of season.zones) {
            const zoneName = zone.zoneName
            const zoneTeams = zone.teams.map((team) => team._id.toString())
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
        teamsInRange = getTeamsInRange(zoneTables, start, end)
        // const zonePositionTable = zoneTables
        // if (!zonePositionTable || !zonePositionTable.positions) {
        //   return res.status(404).json({ message: 'Zone Positions not found' })
        // }

        // teamsInRange = zonePositionTable?.positions?.filter(position => position.puesto >= start && position.puesto <= end)
        //   .map(position => position.team._id.toString())
      } else {
        teamsInRange = getTeamsInRangeFromSingleTable(allStats, start, end)
      }
      query.$and = query.$and || []
      query.$and.push({
        $or: [
          { homeTeam: teamId, awayTeam: { $in: teamsInRange } },
          { awayTeam: teamId, homeTeam: { $in: teamsInRange } }
        ]
      })
    }

    const matches = await Match.find(query)
      .sort({ date: -1 })
      .populate({
        path: 'league',
        select: 'name'
      })
      .populate('homeTeam awayTeam')
      .populate('seasonYear', 'year')
      .populate({
        path: 'seasonYear',
        populate: {
          path: 'league',
          model: 'League'
        }
      })
    const determineRanges = ([start, end], step) => {
      const ranges = {}
      const precision = step === 1 ? 1 : 2

      for (let i = start; i <= end; i += step) {
        const rangeKey = i.toFixed(precision).replace('.', '_')
        ranges[rangeKey] = { count: 0, percentage: 0 }
      }
      return ranges
    }

    const generateStats = (matches, statistics) => {
      const stats = {
        matchesTotalFinished: matches?.length || 0
      }

      if (!statistics || statistics.length === 0) {
        console.error('No se proporcionaron estadísticas válidas.')
        return stats
      }

      statistics.forEach((statistic) => {
        stats[statistic] = {
          total: {
            total: 0,
            values: [],
            overRanges: {},
            underRanges: {}
          },
          received: {
            total: 0,
            values: [],
            overRanges: {},
            underRanges: {}
          },
          scored: {
            total: 0,
            values: [],
            overRanges: {},
            underRanges: {}
          }
        }

        switch (statistic) {
          case 'possession':
            stats[statistic].received.overRanges = determineRanges(
              [40.5, 99.5],
              5
            )
            stats[statistic].scored.overRanges = determineRanges(
              [40.5, 99.5],
              5
            )
            break
          case 'goals':
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 6.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges(
              [0.5, 6.5],
              1
            )
            stats[statistic].total.overRanges = determineRanges(
              [2.5, 11.5],
              1
            )
            break
          case 'corners':
            stats[statistic].total.overRanges = determineRanges(
              [10.5, 20.5],
              2
            )
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 8.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges(
              [0.5, 8.5],
              1
            )
            break
          case 'offsides':
            stats[statistic].total.overRanges = determineRanges(
              [0.5, 9.5],
              2
            )
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 4.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges(
              [0.5, 4.5],
              1
            )
            break
          case 'yellowCards':
            stats[statistic].total.overRanges = determineRanges(
              [3.5, 8.5],
              1
            )
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 5.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges(
              [0.5, 5.5],
              1
            )
            break
          case 'shots':
            stats[statistic].total.overRanges = determineRanges(
              [18.5, 30.5],
              2
            )
            stats[statistic].received.overRanges = determineRanges(
              [7.5, 16.5],
              2
            )
            stats[statistic].scored.overRanges = determineRanges(
              [7.5, 16.5],
              2
            )
            break
          case 'shotsOnTarget':
            stats[statistic].total.overRanges = determineRanges(
              [5.5, 16.5],
              2
            )
            stats[statistic].received.overRanges = determineRanges(
              [3.5, 8.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges(
              [3.5, 8.5],
              1
            )
            break
          case 'foults':
            stats[statistic].total.overRanges = determineRanges(
              [5.5, 16.5],
              2
            )
            stats[statistic].received.overRanges = determineRanges(
              [0.5, 8.5],
              1
            )
            stats[statistic].scored.overRanges = determineRanges(
              [0.5, 8.5],
              1
            )
            break
          default:
            break
        }
        // foults
        ['total', 'received', 'scored'].forEach((type) => {
          const overRanges = stats[statistic][type].overRanges
          Object.keys(overRanges).forEach((rangeKey) => {
            stats[statistic][type].underRanges[rangeKey] = {
              count: 0,
              percentage: 0
            }
          })
        })
      })

      matches.forEach((match) => {
        const isHomeTeam = match.homeTeam._id.toString() === teamId
        const teamStats = isHomeTeam
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const opponentStats = isHomeTeam
          ? match.teamStatistics.visitor
          : match.teamStatistics.local

        statistics.forEach((statistic) => {
          const statValue = teamStats[statistic]
          const receivedValue = opponentStats[statistic]

          if (stats[statistic]) {
            stats[statistic].scored.total += statValue
            stats[statistic].scored.values.push(statValue)
            stats[statistic].received.total += receivedValue
            stats[statistic].received.values.push(receivedValue)
            stats[statistic].total.total += statValue + receivedValue
            stats[statistic].total.values.push(receivedValue)

            Object.keys(stats[statistic].total.overRanges).forEach(
              (rangeKey) => {
                const range = parseFloat(rangeKey.replace('_', '.'))

                if (stats[statistic].total.overRanges[rangeKey]) {
                  if (statValue + receivedValue >= range) {
                    stats[statistic].total.overRanges[rangeKey].count++
                  } else {
                    stats[statistic].total.underRanges[rangeKey].count++
                  }
                }
              }
            )
            Object.keys(stats[statistic].scored.overRanges).forEach(
              (rangeKey) => {
                const range = parseFloat(rangeKey.replace('_', '.'))
                if (stats[statistic].scored.overRanges[rangeKey]) {
                  if (statValue >= range) {
                    stats[statistic].scored.overRanges[rangeKey].count++
                  } else {
                    stats[statistic].scored.underRanges[rangeKey].count++
                  }
                }
              }
            )
            Object.keys(stats[statistic].received.overRanges).forEach(
              (rangeKey) => {
                const range = parseFloat(rangeKey.replace('_', '.'))

                if (stats[statistic].received.overRanges[rangeKey]) {
                  if (receivedValue >= range) {
                    stats[statistic].received.overRanges[rangeKey].count++
                  } else {
                    stats[statistic].received.underRanges[rangeKey].count++
                  }
                }
              }
            )
          } else {
            console.error(`No se encontró stats[${statistic}]`)
          }
        })
      })

      statistics.forEach((statistic) => {
        ['total', 'received', 'scored'].forEach((type) => {
          const totalMatches = stats.matchesTotalFinished
          const overRanges = stats[statistic][type].overRanges
          const underRanges = stats[statistic][type].underRanges

          Object.keys(overRanges).forEach((rangeKey) => {
            if (overRanges[rangeKey]) {
              const overCount = overRanges[rangeKey].count
              const underCount = underRanges[rangeKey].count

              overRanges[rangeKey].percentage = (
                (overCount / totalMatches) *
                  100
              ).toFixed(2)
              underRanges[rangeKey].percentage = (
                (underCount / totalMatches) *
                  100
              ).toFixed(2)
            }
          })
        })
      })

      return stats
    }
    // const teamMatches = matches.filter(
    //   (match) => {
    //     return (match.homeTeam._id.toString() === teamId ||
    //     match.awayTeam._id.toString() === teamId

    //     )
    //   }
    // )

    let filteredMatches = matches

    if (booleanHomeOnly && !booleanAwayOnly) {
      filteredMatches = filteredMatches.filter(
        (match) => match.homeTeam._id.toString() === teamId
      )
    } else if (booleanAwayOnly && !booleanHomeOnly) {
      filteredMatches = filteredMatches.filter(
        (match) => match.awayTeam._id.toString() === teamId
      )
    }

    if (matchesCount && matchesCount > 0) {
      filteredMatches = filteredMatches.slice(0, matchesCount)
    }

    const selectedStatistics = statistics ? statistics.split(',') : []

    const teamStats = generateStats(filteredMatches, selectedStatistics)
    const team = await Team.findById(teamId)

    res.status(200).json([
      {
        team,
        stats: teamStats,
        matches: filteredMatches
      }
    ])
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: 'Error al obtener las estadísticas del equipo.',
      error
    })
  }
}

// const getTeamStatsForTwoTeam = async (req, res) => {
//   const { seasonId } = req.params
//   const teamFilters = req.body // teamFilters será un array con objetos de filtros para cada equipo
//   console.log('teamFilters', teamFilters)
//   try {
//     const matchFilter = {
//       seasonYear: seasonId,
//       isFinished: true
//     }

//     const matches = await Match.find(matchFilter).populate('homeTeam awayTeam')

//     const teamStats = []

//     const initializeTeamStats = (teamName) => ({
//       teamId: teamName,
//       statistics: {
//         goals: { values: [], total: 0 },
//         offsides: { values: [], total: 0 },
//         yellowCards: { values: [], total: 0 },
//         redCards: { values: [], total: 0 },
//         corners: { values: [], total: 0 },
//         shots: { values: [], total: 0 },
//         shotsOnTarget: { values: [], total: 0 },
//         possession: { values: [], total: 0 },
//         fouls: { values: [], total: 0 }
//       },
//       received: {
//         goals: { values: [], total: 0 },
//         offsides: { values: [], total: 0 },
//         yellowCards: { values: [], total: 0 },
//         redCards: { values: [], total: 0 },
//         corners: { values: [], total: 0 },
//         shots: { values: [], total: 0 },
//         shotsOnTarget: { values: [], total: 0 },
//         possession: { values: [], total: 0 },
//         fouls: { values: [], total: 0 }
//       }
//     })

//     // const calculateStats = (teamId, teamName, teamFilter, match, home) => {
//     //   if (!teamStats[teamId]) {
//     //     teamStats[teamId] = initializeTeamStats(teamName)
//     //   }

//     //   const stats = home ? match.teamStatistics.local : match.teamStatistics.visitor
//     //   const receivedStats = home ? match.teamStatistics.visitor : match.teamStatistics.local

//     //   const { matchType = 'both', matchesCount, positions } = teamFilter

//     //   if (matchType === 'home' && !home) return
//     //   if (matchType === 'away' && home) return

//     //   const {
//     //     goals,
//     //     offsides,
//     //     yellowCards,
//     //     redCards,
//     //     corners,
//     //     shots,
//     //     shotsOnTarget,
//     //     possession,
//     //     foults: fouls
//     //   } = stats

//     //   teamStats[teamId].statistics.goals.values.push(goals || 0)
//     //   teamStats[teamId].statistics.goals.total += goals || 0
//     //   teamStats[teamId].statistics.offsides.values.push(offsides || 0)
//     //   teamStats[teamId].statistics.offsides.total += offsides || 0
//     //   teamStats[teamId].statistics.yellowCards.values.push(yellowCards || 0)
//     //   teamStats[teamId].statistics.yellowCards.total += yellowCards || 0
//     //   teamStats[teamId].statistics.redCards.values.push(redCards || 0)
//     //   teamStats[teamId].statistics.redCards.total += redCards || 0
//     //   teamStats[teamId].statistics.corners.values.push(corners || 0)
//     //   teamStats[teamId].statistics.corners.total += corners || 0
//     //   teamStats[teamId].statistics.shots.values.push(shots || 0)
//     //   teamStats[teamId].statistics.shots.total += shots || 0
//     //   teamStats[teamId].statistics.shotsOnTarget.values.push(shotsOnTarget || 0)
//     //   teamStats[teamId].statistics.shotsOnTarget.total += shotsOnTarget || 0
//     //   teamStats[teamId].statistics.possession.values.push(possession || 0)
//     //   teamStats[teamId].statistics.possession.total += possession || 0
//     //   teamStats[teamId].statistics.fouls.values.push(fouls || 0)
//     //   teamStats[teamId].statistics.fouls.total += fouls || 0

//     //   const {
//     //     goals: recGoals,
//     //     offsides: recOffsides,
//     //     yellowCards: recYellowCards,
//     //     redCards: recRedCards,
//     //     corners: recCorners,
//     //     shots: recShots,
//     //     shotsOnTarget: recShotsOnTarget,
//     //     possession: recPossession,
//     //     foults: recFouls
//     //   } = receivedStats

//     //   teamStats[teamId].received.goals.values.push(recGoals || 0)
//     //   teamStats[teamId].received.goals.total += recGoals || 0
//     //   teamStats[teamId].received.offsides.values.push(recOffsides || 0)
//     //   teamStats[teamId].received.offsides.total += recOffsides || 0
//     //   teamStats[teamId].received.yellowCards.values.push(recYellowCards || 0)
//     //   teamStats[teamId].received.yellowCards.total += recYellowCards || 0
//     //   teamStats[teamId].received.redCards.values.push(recRedCards || 0)
//     //   teamStats[teamId].received.redCards.total += recRedCards || 0
//     //   teamStats[teamId].received.corners.values.push(recCorners || 0)
//     //   teamStats[teamId].received.corners.total += recCorners || 0
//     //   teamStats[teamId].received.shots.values.push(recShots || 0)
//     //   teamStats[teamId].received.shots.total += recShots || 0
//     //   teamStats[teamId].received.shotsOnTarget.values.push(recShotsOnTarget || 0)
//     //   teamStats[teamId].received.shotsOnTarget.total += recShotsOnTarget || 0
//     //   teamStats[teamId].received.possession.values.push(recPossession || 0)
//     //   teamStats[teamId].received.possession.total += recPossession || 0
//     //   teamStats[teamId].received.fouls.values.push(recFouls || 0)
//     //   teamStats[teamId].received.fouls.total += recFouls || 0
//     // }

//     const calculateStats = (teamId, teamName, teamFilter, match, home) => {
//       console.log('Calculating stats for team:', teamId, teamName)
//       let teamStat = teamStats.find((team) => team.teamId === teamId)
//       if (!teamStat) {
//         teamStat = initializeTeamStats(teamId, teamName)
//         teamStats.push(teamStat)
//       }

//       const stats = home ? match.teamStatistics.local : match.teamStatistics.visitor
//       const receivedStats = home ? match.teamStatistics.visitor : match.teamStatistics.local

//       const { matchType = 'both', matchesCount, positions } = teamFilter

//       if (matchType === 'home' && !home) return
//       if (matchType === 'away' && home) return

//       const {
//         goals,
//         offsides,
//         yellowCards,
//         redCards,
//         corners,
//         shots,
//         shotsOnTarget,
//         possession,
//         fouls
//       } = stats

//       teamStat.statistics.goals.values.push(goals || 0)
//       teamStat.statistics.goals.total += goals || 0
//       teamStat.statistics.offsides.values.push(offsides || 0)
//       teamStat.statistics.offsides.total += offsides || 0
//       teamStat.statistics.yellowCards.values.push(yellowCards || 0)
//       teamStat.statistics.yellowCards.total += yellowCards || 0
//       teamStat.statistics.redCards.values.push(redCards || 0)
//       teamStat.statistics.redCards.total += redCards || 0
//       teamStat.statistics.corners.values.push(corners || 0)
//       teamStat.statistics.corners.total += corners || 0
//       teamStat.statistics.shots.values.push(shots || 0)
//       teamStat.statistics.shots.total += shots || 0
//       teamStat.statistics.shotsOnTarget.values.push(shotsOnTarget || 0)
//       teamStat.statistics.shotsOnTarget.total += shotsOnTarget || 0
//       teamStat.statistics.possession.values.push(possession || 0)
//       teamStat.statistics.possession.total += possession || 0
//       teamStat.statistics.fouls.values.push(fouls || 0)
//       teamStat.statistics.fouls.total += fouls || 0

//       const {
//         goals: recGoals,
//         offsides: recOffsides,
//         yellowCards: recYellowCards,
//         redCards: recRedCards,
//         corners: recCorners,
//         shots: recShots,
//         shotsOnTarget: recShotsOnTarget,
//         possession: recPossession,
//         fouls: recFouls
//       } = receivedStats

//       teamStat.received.goals.values.push(recGoals || 0)
//       teamStat.received.goals.total += recGoals || 0
//       teamStat.received.offsides.values.push(recOffsides || 0)
//       teamStat.received.offsides.total += recOffsides || 0
//       teamStat.received.yellowCards.values.push(recYellowCards || 0)
//       teamStat.received.yellowCards.total += recYellowCards || 0
//       teamStat.received.redCards.values.push(recRedCards || 0)
//       teamStat.received.redCards.total += recRedCards || 0
//       teamStat.received.corners.values.push(recCorners || 0)
//       teamStat.received.corners.total += recCorners || 0
//       teamStat.received.shots.values.push(recShots || 0)
//       teamStat.received.shots.total += recShots || 0
//       teamStat.received.shotsOnTarget.values.push(recShotsOnTarget || 0)
//       teamStat.received.shotsOnTarget.total += recShotsOnTarget || 0
//       teamStat.received.possession.values.push(recPossession || 0)
//       teamStat.received.possession.total += recPossession || 0
//       teamStat.received.fouls.values.push(recFouls || 0)
//       teamStat.received.fouls.total += recFouls || 0
//     }

//     matches.forEach((match) => {
//       teamFilters.forEach((filter) => {
//         const { teamId, teamName, matchType = 'both' } = filter
//         // console.log('teamId, teamName0', teamId, teamName)
//         if (matchType === 'home' || matchType === 'both') {
//           if (match.homeTeam._id.toString() === teamId) {
//             calculateStats(teamId, teamName, filter, match, true)
//           }
//         }

//         if (matchType === 'away' || matchType === 'both') {
//           if (match.awayTeam._id.toString() === teamId) {
//             calculateStats(teamId, teamName, filter, match, false)
//           }
//         }
//       })
//     })
//     console.log('teamStats:', JSON.stringify(teamStats, null, 2))
//     res.json(teamStats)
//   } catch (error) {
//     res.status(500).json({ message: 'Error al obtener las estadísticas del equipo', error })
//   }
// }

const getTeamStatsForSingleTeam = async (req, res) => {
  const { teamId } = req.params
  const {
    season, // Could be a comma-separated string of season IDs
    matchesCount,
    homeOnly = 'true',
    awayOnly = 'true',
    currentSeason = 'true',
    includeAllSeasonMatches = 'false',
    position = 'false'
  } = req.query
  try {
    const seasonIds = season ? season.split(',') : []
    let matchFilter
    if (seasonIds.length > 0) {
      matchFilter = {
        seasonYear: { $in: seasonIds },
        isFinished: true
      }
    } else {
      matchFilter = {

        isFinished: true
      }
    }

    // Aplicar filtros de local y visitante
    if (homeOnly === 'true' && awayOnly === 'false') {
      matchFilter.homeTeam = teamId
    } else if (homeOnly === 'false' && awayOnly === 'true') {
      matchFilter.awayTeam = teamId
    } else {
      matchFilter.$or = [{ homeTeam: teamId }, { awayTeam: teamId }]
    }

    // Ajustes adicionales si se requiere incluir todos los partidos de la temporada
    if (includeAllSeasonMatches === 'false' && seasonIds.length === 1) {
      // Lógica adicional para filtrar según la posición del rival o alguna otra condición
    }

    let matches = await Match.find(matchFilter).sort({ date: -1 }).populate('homeTeam awayTeam')
    // Limitar la cantidad de partidos si se ha especificado matchesCount
    const matchesLimit = parseInt(matchesCount, 10)
    if (!isNaN(matchesLimit) && matchesLimit > 0) {
      matches = matches.slice(0, matchesLimit)
    }

    // Inicializar estadísticas para un solo equipo
    const teamStats = {
      teamId,
      statistics: {
        goals: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        offsides: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        yellowCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        redCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        corners: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        shots: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        shotsOnTarget: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        possession: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        foults: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 }
      },
      received: {
        goals: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        offsides: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        yellowCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        redCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        corners: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        shots: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        shotsOnTarget: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        possession: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
        foults: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 }
      }
    }

    const calculateStats = (values) => {
      if (values.length === 0) {
        return { promedio: 0, mediana: 0, desviacion: 0 }
      }

      const promedio = parseFloat(ss.mean(values).toFixed(1))
      const mediana = parseFloat(ss.median(values).toFixed(1))
      const desviacion = parseFloat(ss.standardDeviation(values).toFixed(1))

      return { promedio, mediana, desviacion }
    }

    const finalizeStats = (teamStats) => {
      Object.keys(teamStats.statistics).forEach((statKey) => {
        const stat = teamStats.statistics[statKey]
        const calculated = calculateStats(stat.values)
        stat.promedio = calculated.promedio
        stat.mediana = calculated.mediana
        stat.desviacion = calculated.desviacion
      })

      Object.keys(teamStats.received).forEach((statKey) => {
        const stat = teamStats.received[statKey]
        const calculated = calculateStats(stat.values)
        stat.promedio = calculated.promedio
        stat.mediana = calculated.mediana
        stat.desviacion = calculated.desviacion
      })
    }

    matches.forEach((match) => {
      const home = match.homeTeam._id.toString() === teamId
      const teamName = home ? match?.homeTeam?.name : match?.awayTeam?.name

      // Asignar el nombre del equipo si no ha sido asignado todavía
      if (!teamStats.teamName) {
        teamStats.teamName = teamName
      }

      const stats = home ? match.teamStatistics.local : match.teamStatistics.visitor
      const receivedStats = home ? match.teamStatistics.visitor : match.teamStatistics.local
      // Guardar estadísticas del equipo
      Object.keys(stats).forEach((key) => {
        if (teamStats.statistics[key]) {
          teamStats.statistics[key].values.push(stats[key] || 0)
          teamStats.statistics[key].total += stats[key] || 0
        }
      })

      // Guardar estadísticas recibidas por el equipo
      Object.keys(receivedStats).forEach((key) => {
        if (teamStats.received[key]) {
          teamStats.received[key].values.push(receivedStats[key] || 0)
          teamStats.received[key].total += receivedStats[key] || 0
        }
      })
    })

    finalizeStats(teamStats)
    res.json([teamStats])
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las estadísticas del equipo', error })
  }
}

// const getTeamStatsForTwoTeam = async (req, res) => {
//   const { seasonId } = req.params
//   const teamFilters = req.body // teamFilters será un array con objetos de filtros para cada equipo
//   console.log('teamFilters:', teamFilters)

//   try {
//     const matchFilter = {
//       seasonYear: seasonId,
//       isFinished: true
//     }

//     const matches = await Match.find(matchFilter).populate('homeTeam awayTeam')

//     const teamStats = []

//     const initializeTeamStats = (teamId, teamName) => ({
//       teamId,
//       teamName,
//       statistics: {
//         goals: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         offsides: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         yellowCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         redCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         corners: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         shots: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         shotsOnTarget: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         possession: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         fouls: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 }
//       },
//       received: {
//         goals: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         offsides: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         yellowCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         redCards: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         corners: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         shots: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         shotsOnTarget: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         possession: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 },
//         fouls: { values: [], total: 0, promedio: 0, mediana: 0, desviacion: 0 }
//       }
//     })

//     const calculateStats = (values) => {
//       if (values.length === 0) {
//         return { promedio: 0, mediana: 0, desviacion: 0 }
//       }

//       const promedio = parseFloat(ss.mean(values).toFixed(1))
//       const mediana = parseFloat(ss.median(values).toFixed(1))
//       const desviacion = parseFloat(ss.standardDeviation(values).toFixed(1))

//       return { promedio, mediana, desviacion }
//     }

//     const finalizeStats = (teamStats) => {
//       Object.keys(teamStats.statistics).forEach((statKey) => {
//         const stat = teamStats.statistics[statKey]
//         const calculated = calculateStats(stat.values)
//         stat.promedio = calculated.promedio
//         stat.mediana = calculated.mediana
//         stat.desviacion = calculated.desviacion
//       })

//       Object.keys(teamStats.received).forEach((statKey) => {
//         const stat = teamStats.received[statKey]
//         const calculated = calculateStats(stat.values)
//         stat.promedio = calculated.promedio
//         stat.mediana = calculated.mediana
//         stat.desviacion = calculated.desviacion
//       })
//     }

//     const calculateStatsForMatch = (teamId, teamName, teamFilter, match, home, teamStats) => {
//       let teamStat = teamStats.find((team) => team.teamId === teamId)
//       if (!teamStat) {
//         teamStat = initializeTeamStats(teamId, teamName)
//         teamStats.push(teamStat)
//       }

//       const stats = home ? match.teamStatistics.local : match.teamStatistics.visitor
//       const receivedStats = home ? match.teamStatistics.visitor : match.teamStatistics.local

//       const { matchType = 'both' } = teamFilter

//       if (matchType === 'home' && !home) return
//       if (matchType === 'away' && home) return

//       const {
//         goals,
//         offsides,
//         yellowCards,
//         redCards,
//         corners,
//         shots,
//         shotsOnTarget,
//         possession,
//         fouls
//       } = stats

//       teamStat.statistics.goals.values.push(goals || 0)
//       teamStat.statistics.goals.total += goals || 0
//       teamStat.statistics.offsides.values.push(offsides || 0)
//       teamStat.statistics.offsides.total += offsides || 0
//       teamStat.statistics.yellowCards.values.push(yellowCards || 0)
//       teamStat.statistics.yellowCards.total += yellowCards || 0
//       teamStat.statistics.redCards.values.push(redCards || 0)
//       teamStat.statistics.redCards.total += redCards || 0
//       teamStat.statistics.corners.values.push(corners || 0)
//       teamStat.statistics.corners.total += corners || 0
//       teamStat.statistics.shots.values.push(shots || 0)
//       teamStat.statistics.shots.total += shots || 0
//       teamStat.statistics.shotsOnTarget.values.push(shotsOnTarget || 0)
//       teamStat.statistics.shotsOnTarget.total += shotsOnTarget || 0
//       teamStat.statistics.possession.values.push(possession || 0)
//       teamStat.statistics.possession.total += possession || 0
//       teamStat.statistics.fouls.values.push(fouls || 0)
//       teamStat.statistics.fouls.total += fouls || 0

//       const {
//         goals: recGoals,
//         offsides: recOffsides,
//         yellowCards: recYellowCards,
//         redCards: recRedCards,
//         corners: recCorners,
//         shots: recShots,
//         shotsOnTarget: recShotsOnTarget,
//         possession: recPossession,
//         fouls: recFouls
//       } = receivedStats

//       teamStat.received.goals.values.push(recGoals || 0)
//       teamStat.received.goals.total += recGoals || 0
//       teamStat.received.offsides.values.push(recOffsides || 0)
//       teamStat.received.offsides.total += recOffsides || 0
//       teamStat.received.yellowCards.values.push(recYellowCards || 0)
//       teamStat.received.yellowCards.total += recYellowCards || 0
//       teamStat.received.redCards.values.push(recRedCards || 0)
//       teamStat.received.redCards.total += recRedCards || 0
//       teamStat.received.corners.values.push(recCorners || 0)
//       teamStat.received.corners.total += recCorners || 0
//       teamStat.received.shots.values.push(recShots || 0)
//       teamStat.received.shots.total += recShots || 0
//       teamStat.received.shotsOnTarget.values.push(recShotsOnTarget || 0)
//       teamStat.received.shotsOnTarget.total += recShotsOnTarget || 0
//       teamStat.received.possession.values.push(recPossession || 0)
//       teamStat.received.possession.total += recPossession || 0
//       teamStat.received.fouls.values.push(recFouls || 0)
//       teamStat.received.fouls.total += recFouls || 0
//     }

//     matches.forEach((match) => {
//       teamFilters.forEach((filter) => {
//         const { teamId, matchType = 'both' } = filter
//         const homeTeamName = match.homeTeam.name
//         const awayTeamName = match.awayTeam.name

//         if (matchType === 'home' || matchType === 'both') {
//           if (match.homeTeam._id.toString() === teamId) {
//             calculateStatsForMatch(teamId, homeTeamName, filter, match, true, teamStats)
//           }
//         }

//         if (matchType === 'away' || matchType === 'both') {
//           if (match.awayTeam._id.toString() === teamId) {
//             calculateStatsForMatch(teamId, awayTeamName, filter, match, false, teamStats)
//           }
//         }
//       })
//     })

//     teamStats.forEach(finalizeStats)
//     console.log('teamStats', teamStats)
//     res.json(teamStats)
//   } catch (error) {
//     res.status(500).json({ message: 'Error al obtener las estadísticas del equipo', error })
//   }
// }

export const methods = {
  getAllMatches,
  createMatch,
  updateMatchResult,
  getMatchById,
  getMatchesByTeamId,
  getTeamStats,
  deleteMatchById,
  updateMatchById,
  getTeamStatsForSeason,
  // getTeamStatsForTwoTeam,
  getAllTeamsStats,
  getTeamStatsNew,
  getTeamStatsForSingleTeam
}
