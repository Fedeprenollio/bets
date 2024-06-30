import * as ss from 'simple-statistics'
import { Match } from '../../schemas/match.js'
import { Team } from '../../schemas/team.js'
import { League } from '../../schemas/leagueSchema.js'
import { Fecha } from '../../schemas/fechaSchema.js'
import { Season } from '../../schemas/seasonSchema.js'
import { PositionTable } from '../../schemas/tablePositionsSchema.js'
import { calculatePositionTables } from '../services/tablePositions.js'
import { Zone } from '../../schemas/zoneSchema.js'
import { getMatchesAndStats } from '../services/getMatchesAndStats .js'
import { calculatePositionTablesZone } from '../services/getTablePositionsZone.js'
import {
  updateSeasonPositionTable,
  updateZonePositionTablesFromGeneral
} from '../services/updatePositionTables.js'
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

    res.send(matches)
  } catch (error) {
    console.error('Error fetching matches:', error)
    res.status(500).send('An error occurred while fetching matches')
  }
}

// Controlador para crear un nuevo partido
// const createMatch = async (req, res) => {
//   try {
//     const {
//       homeTeamName,
//       awayTeamName,
//       date,
//       league,
//       seasonYear,
//       round,
//       country
//     } = req.body

//     // Buscar los IDs de los equipos en la base de datos
//     const homeTeam = await Team.findOne({ name: homeTeamName })
//     const awayTeam = await Team.findOne({ name: awayTeamName })

//     if (!homeTeam || !awayTeam) {
//       return res
//         .status(400)
//         .send('Uno o ambos equipos no existen en la base de datos')
//     }

//     // Crear un nuevo partido con los IDs encontrados y la fecha proporcionada
//     const match = new Match({
//       homeTeam: homeTeam._id,
//       awayTeam: awayTeam._id,
//       date,
//       country,
//       league,
//       seasonYear,
//       round
//     })
//     await match.save()

//     // Obtener toda la información de los equipos y agregarla a la respuesta
//     const populatedMatch = await match.populate('homeTeam awayTeam')

//     // Actualizar la lista de partidos en la liga correspondiente
//     const updatedLeague = await League.findByIdAndUpdate(
//       league,
//       { $push: { matches: match._id } },
//       { new: true }
//     )

//     res.status(201).send(populatedMatch)
//   } catch (error) {
//     console.error('Error creating match:', error)
//     res.status(500).send('An error occurred while creating the match')
//   }
// }
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
    const { goalsHome, goalsAway, teamStatistics } = req.body
    const matchId = req.params.id

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
// const getTeamStats = async (req, res) => {
//   try {
//     const idTeam = req.params.idTeam
//     const {
//       statistic,
//       matchesCount = 5,
//       homeOnly = true,
//       awayOnly = true,
//       lowerLimit,
//       upperLimit,
//       lessThan = false // Nuevo query para buscar partidos con menos de cierta cantidad
//     } = req.query
//     const booleanHomeOnly = homeOnly === 'true'
//     const booleanAwayOnly = awayOnly === 'true'
//     const boolenaLessThan = lessThan === 'true'
//     // let query = { isFinished: true }
//     let query = {
//       $and: [{ isFinished: true }]
//     }

//     if (booleanHomeOnly && !booleanAwayOnly) {
//       // query = { ...query, 'homeTeam._id': idTeam }
//       query.$and.push({ homeTeam: idTeam })
//     } else if (booleanAwayOnly && !booleanHomeOnly) {
//       // query = { ...query, 'awayTeam._id': idTeam }
//       query.$and.push({ awayTeam: idTeam })
//     } else if (booleanHomeOnly && booleanAwayOnly) {
//       query = {
//         $and: [
//           { isFinished: true },
//           {
//             $or: [
//               { homeTeam: idTeam },
//               { awayTeam: idTeam }
//               // {
//               //   [`teamStatistics.local.${statistic}`]: { $gte: parseFloat(lowerLimit), $lte: parseFloat(upperLimit) }
//               // },
//               // {
//               //   [`teamStatistics.visitor.${statistic}`]: { $gte: parseFloat(lowerLimit), $lte: parseFloat(upperLimit) }
//               // }
//             ]
//           }
//         ]
//       }
//       // query = {
//       //   ...query,
//       //   $or: [{ 'homeTeam._id': idTeam }, { 'awayTeam._id': idTeam }]
//       // }
//     } else {
//       // Si no se especifican filtros de local y visitante, devolver estadísticas vacías
//       const emptyStats = {
//         matchesTotalFinished: 0,
//         few: 0,
//         many: 0,
//         total: 0
//       }

//       const allStats = {
//         teamId: idTeam,
//         teamName: 'Nombre del Equipo', // Puedes establecer el nombre del equipo aquí
//         matches: [], // No hay partidos para mostrar
//         matchesCount: 0,
//         homeOnly,
//         awayOnly,
//         [statistic]: emptyStats,
//         lessThan
//       }
//       return res.status(200).json(allStats)
//     }

//     const matches = await Match.find(query)
//       .sort({ date: -1 })
//       .limit(parseInt(matchesCount))
//       .populate({
//         path: 'league',
//         select: 'name' // Selecciona solo el nombre de la liga para la población
//       })
//       .populate('homeTeam awayTeam')
//       .populate('seasonYear', 'year') // Poblar el año de la temporada

//     const team = await Team.findById(idTeam)

//     const generateStats = (matches, statistic, lowerLimit, upperLimit) => {
//       const stats = {
//         matchesTotalFinished: matches?.length || 0,
//         few: 0,
//         many: 0,
//         total: 0
//       }

//       const ranges = []
//       for (let i = parseFloat(lowerLimit); i <= parseFloat(upperLimit); i++) {
//         ranges.push(i)
//       }

//       ranges.forEach((range) => {
//         const key = `matchesWith${range.toString().replace('.', '_')}`
//         stats[key] = 0
//       })

//       matches.forEach((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const statValue = teamStats[statistic]

//         stats.total += statValue

//         ranges.forEach((range) => {
//           const key = `matchesWith${range.toString().replace('.', '_')}`
//           if (boolenaLessThan) {
//             // Si lessThan es true, contabiliza los partidos donde la estadística es menor que el rango
//             if (statValue < range) {
//               stats[key]++
//             }
//           } else {
//             // Si lessThan es false, contabiliza los partidos donde la estadística es mayor o igual que el rango
//             if (statValue > range) {
//               stats[key]++
//             }
//           }
//         })

//         if (boolenaLessThan) {
//           // Si lessThan es true, contabiliza los partidos donde la estadística es menor que el límite inferior
//           if (statValue < lowerLimit) {
//             stats.few++
//           }
//         } else {
//           // Si lessThan es false, contabiliza los partidos donde la estadística es mayor o igual que el límite inferior
//           if (statValue >= lowerLimit) {
//             stats.few++
//           }
//         }
//       })

//       return stats
//     }

//     const stats = generateStats(
//       matches,
//       statistic,
//       parseFloat(lowerLimit),
//       parseFloat(upperLimit)
//     )

//     const allStats = {
//       teamId: team._id,
//       teamName: team.name,
//       matches,
//       matchesCount,
//       homeOnly,
//       awayOnly,
//       [statistic]: stats,
//       lessThan, // Agregar la propiedad lessThan al resultado
//       matchesWithStatistic: matches.filter((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const statValue = teamStats[statistic]
//         if (boolenaLessThan) {
//           return statValue < parseFloat(upperLimit)
//         } else {
//           return statValue >= parseFloat(lowerLimit)
//         }
//       }),
//       matchesWithRange: matches.filter((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const statValue = teamStats[statistic]
//         if (boolenaLessThan) {
//           return (
//             parseFloat(lowerLimit) < statValue &&
//             statValue < parseFloat(upperLimit)
//           )
//         } else {
//           return (
//             parseFloat(lowerLimit) <= statValue &&
//             statValue <= parseFloat(upperLimit)
//           )
//         }
//       })
//     }
//     res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error fetching team stats:', error)
//     res.status(500).send('An error occurred while fetching team stats')
//   }
// }

// Controlador para obtener estadísticas de un equipo
// const getTeamStats = async (req, res) => {
//   try {
//     const idTeam = req.params.idTeam
//     const {
//       statistic,
//       matchesCount = 5,
//       homeOnly = true,
//       awayOnly = true,
//       lowerLimit,
//       upperLimit,
//       lessThan = false // Nuevo query para buscar partidos con menos de cierta cantidad
//     } = req.query

//     const booleanHomeOnly = homeOnly === 'true'
//     const booleanAwayOnly = awayOnly === 'true'
//     const boolenaLessThan = lessThan === 'true'

//     let query = {
//       $and: [{ isFinished: true }]
//     }

//     if (booleanHomeOnly && !booleanAwayOnly) {
//       query.$and.push({ homeTeam: idTeam })
//     } else if (booleanAwayOnly && !booleanHomeOnly) {
//       query.$and.push({ awayTeam: idTeam })
//     } else if (booleanHomeOnly && booleanAwayOnly) {
//       query = {
//         $and: [
//           { isFinished: true },
//           {
//             $or: [
//               { homeTeam: idTeam },
//               { awayTeam: idTeam }
//             ]
//           }
//         ]
//       }
//     } else {
//       const emptyStats = {
//         matchesTotalFinished: 0,
//         few: 0,
//         many: 0,
//         total: 0,
//         values: [] // Incluir un array vacío para los valores
//       }

//       const allStats = {
//         teamId: idTeam,
//         teamName: 'Nombre del Equipo',
//         matches: [],
//         matchesCount: 0,
//         homeOnly,
//         awayOnly,
//         [statistic]: emptyStats,
//         lessThan,
//         receivedStats: emptyStats
//       }
//       return res.status(200).json(allStats)
//     }

//     const matches = await Match.find(query)
//       .sort({ date: -1 })
//       .limit(parseInt(matchesCount))
//       .populate({
//         path: 'league',
//         select: 'name'
//       })
//       .populate('homeTeam awayTeam')
//       .populate('seasonYear', 'year')

//     const team = await Team.findById(idTeam)

//     const generateStats = (matches, statistic, lowerLimit, upperLimit, isReceived = false) => {
//       const stats = {
//         matchesTotalFinished: matches?.length || 0,
//         few: 0,
//         many: 0,
//         total: 0,
//         values: [] // Array para almacenar los valores utilizados
//       }

//       const ranges = []
//       for (let i = parseFloat(lowerLimit); i <= parseFloat(upperLimit); i++) {
//         ranges.push(i)
//       }

//       ranges.forEach((range) => {
//         const key = `matchesWith${range.toString().replace('.', '_')}`
//         stats[key] = 0
//       })

//       matches.forEach((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? isReceived ? match.teamStatistics.visitor : match.teamStatistics.local
//           : isReceived ? match.teamStatistics.local : match.teamStatistics.visitor

//         const statValue = teamStats[statistic]
//         stats.total += statValue
//         stats.values.push(statValue) // Agregar el valor al array

//         ranges.forEach((range) => {
//           const key = `matchesWith${range.toString().replace('.', '_')}`
//           if (boolenaLessThan) {
//             if (statValue < range) {
//               stats[key]++
//             }
//           } else {
//             if (statValue >= range) {
//               stats[key]++
//             }
//           }
//         })

//         if (boolenaLessThan) {
//           if (statValue < lowerLimit) {
//             stats.few++
//           }
//         } else {
//           if (statValue >= lowerLimit) {
//             stats.few++
//           }
//         }
//       })

//       return stats
//     }

//     const stats = generateStats(
//       matches,
//       statistic,
//       parseFloat(lowerLimit),
//       parseFloat(upperLimit)
//     )

//     const receivedStats = generateStats(
//       matches,
//       statistic,
//       parseFloat(lowerLimit),
//       parseFloat(upperLimit),
//       true
//     )

//     const allStats = {
//       teamId: team._id,
//       teamName: team.name,
//       matches,
//       matchesCount,
//       homeOnly,
//       awayOnly,
//       [statistic]: { ...stats, receivedStats },
//       lessThan,
//       receivedStats, // Agregar las estadísticas recibidas
//       matchesWithStatistic: matches.filter((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const statValue = teamStats[statistic]
//         if (boolenaLessThan) {
//           return statValue < parseFloat(upperLimit)
//         } else {
//           return statValue >= parseFloat(lowerLimit)
//         }
//       }),
//       matchesWithRange: matches.filter((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const statValue = teamStats[statistic]
//         if (boolenaLessThan) {
//           return (
//             parseFloat(lowerLimit) < statValue &&
//             statValue < parseFloat(upperLimit)
//           )
//         } else {
//           return (
//             parseFloat(lowerLimit) <= statValue &&
//             statValue <= parseFloat(upperLimit)
//           )
//         }
//       })
//     }

//     res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error fetching team stats:', error)
//     res.status(500).send('An error occurred while fetching team stats')
//   }
// }

// const getTeamStats = async (req, res) => {
//   try {
//     const idTeam = req.params.idTeam
//     const {
//       statistic,
//       matchesCount = 5,
//       homeOnly = true,
//       awayOnly = true,
//       lowerLimit,
//       upperLimit,
//       lessThan = false,
//       currentSeason,
//       position
//     } = req.query
//     console.log('currentSeason:', currentSeason)
//     const booleanHomeOnly = homeOnly === 'true'
//     const booleanAwayOnly = awayOnly === 'true'
//     const booleanLessThan = lessThan === 'true'
//     const booleanPosition = position !== 'false'
//     const query = {
//       $and: [{ isFinished: true }]
//     }

//     if (booleanHomeOnly && !booleanAwayOnly) {
//       query.$and.push({ homeTeam: idTeam })
//     } else if (booleanAwayOnly && !booleanHomeOnly) {
//       query.$and.push({ awayTeam: idTeam })
//     } else if (booleanHomeOnly && booleanAwayOnly) {
//       query.$and.push({
//         $or: [
//           { homeTeam: idTeam },
//           { awayTeam: idTeam }
//         ]
//       })
//     } else {
//       const emptyStats = {
//         matchesTotalFinished: 0,
//         few: 0,
//         many: 0,
//         total: 0,
//         values: [] // Incluir un array vacío para los valores
//       }

//       const allStats = {
//         teamId: idTeam,
//         teamName: 'Nombre del Equipo',
//         matches: [],
//         matchesCount: 0,
//         homeOnly,
//         awayOnly,
//         [statistic]: emptyStats,
//         lessThan,
//         receivedStats: emptyStats
//       }
//       return res.status(200).json(allStats)
//     }

//     if (booleanPosition) {
//       const [start, end] = position.split('-').map(Number)

//       const season = await Season.findById(currentSeason)

//       if (!season) {
//         return res.status(404).json({ message: 'Current season not found' })
//       }

//       const generalPositionTableId = season.positionTables.general

//       if (!generalPositionTableId) {
//         await calculatePositionTables(currentSeason)
//       }

//       const generalPositionTable = await PositionTable.findById(generalPositionTableId).populate('positions.team')

//       if (!generalPositionTable || !generalPositionTable.positions) {
//         return res.status(404).json({ message: 'Positions not found' })
//       }

//       const teamsInRange = generalPositionTable.positions
//         .filter(position => position.puesto >= start && position.puesto <= end)
//         .map(position => position.team._id.toString())

//       query.$and.push({
//         $or: [
//           { homeTeam: idTeam, awayTeam: { $in: teamsInRange } },
//           { awayTeam: idTeam, homeTeam: { $in: teamsInRange } }
//         ]
//       })
//     }

//     const matches = await Match.find(query)
//       .sort({ date: -1 })
//       .limit(parseInt(matchesCount))
//       .populate({
//         path: 'league',
//         select: 'name'
//       })
//       .populate('homeTeam awayTeam')
//       .populate('seasonYear', 'year')

//     const team = await Team.findById(idTeam)

//     const generateStats = (matches, statistic, lowerLimit, upperLimit, isReceived = false) => {
//       const stats = {
//         matchesTotalFinished: matches?.length || 0,
//         few: 0,
//         many: 0,
//         total: 0,
//         values: [] // Array para almacenar los valores utilizados
//       }

//       const ranges = []
//       for (let i = parseFloat(lowerLimit); i <= parseFloat(upperLimit); i++) {
//         ranges.push(i)
//       }

//       ranges.forEach((range) => {
//         const key = `matchesWith${range.toString().replace('.', '_')}`
//         stats[key] = 0
//       })

//       matches.forEach((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? isReceived ? match.teamStatistics.visitor : match.teamStatistics.local
//           : isReceived ? match.teamStatistics.local : match.teamStatistics.visitor

//         const statValue = teamStats[statistic]
//         stats.total += statValue
//         stats.values.push(statValue) // Agregar el valor al array

//         ranges.forEach((range) => {
//           const key = `matchesWith${range.toString().replace('.', '_')}`
//           if (booleanLessThan) {
//             if (statValue < range) {
//               stats[key]++
//             }
//           } else {
//             if (statValue >= range) {
//               stats[key]++
//             }
//           }
//         })

//         if (booleanLessThan) {
//           if (statValue < lowerLimit) {
//             stats.few++
//           }
//         } else {
//           if (statValue >= lowerLimit) {
//             stats.few++
//           }
//         }
//       })

//       return stats
//     }

//     const stats = generateStats(
//       matches,
//       statistic,
//       parseFloat(lowerLimit),
//       parseFloat(upperLimit)
//     )

//     const receivedStats = generateStats(
//       matches,
//       statistic,
//       parseFloat(lowerLimit),
//       parseFloat(upperLimit),
//       true
//     )

//     const allStats = {
//       teamId: team._id,
//       teamName: team.name,
//       matches,
//       matchesCount,
//       homeOnly,
//       awayOnly,
//       [statistic]: { ...stats, receivedStats },
//       lessThan,
//       receivedStats, // Agregar las estadísticas recibidas
//       matchesWithStatistic: matches.filter((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const statValue = teamStats[statistic]
//         if (booleanLessThan) {
//           return statValue < parseFloat(upperLimit)
//         } else {
//           return statValue >= parseFloat(lowerLimit)
//         }
//       }),
//       matchesWithRange: matches.filter((match) => {
//         const teamStats = match.homeTeam.equals(idTeam)
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor
//         const statValue = teamStats[statistic]
//         if (booleanLessThan) {
//           return (
//             parseFloat(lowerLimit) < statValue &&
//             statValue < parseFloat(upperLimit)
//           )
//         } else {
//           return (
//             parseFloat(lowerLimit) <= statValue &&
//             statValue <= parseFloat(upperLimit)
//           )
//         }
//       })
//     }
//     res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error fetching team stats:', error)
//     res.status(500).send('An error occurred while fetching team stats')
//   }
// }
// Controlador para obtener estadísticas de un equipo (EN PRUEBA)

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

const getAllTeamsStats = async (req, res) => {
  const {
    season,
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

    if (season && !booleanIncludeAllSeasonMatches) {
      query.seasonYear = season
    }
    let teamIds = []
    if (booleanIncludeAllSeasonMatches && season) {
      const seasonData = await Season.findById(season).populate('teams')
      if (seasonData) {
        teamIds = seasonData.teams.map((team) => team._id.toString())
      }
    }
    console.log('teamIds', teamIds)

    // if (booleanIncludeAllSeasonMatches && teamIds.length > 0) {
    //   query.$or = [
    //     { homeTeam: { $in: teamIds } },
    //     { awayTeam: { $in: teamIds } }
    //   ]
    // }

    // let teamIds = []
    // if (season) {
    //   const seasonData = await Season.findOne({ year: '2025' }).populate(
    //     'teams'
    //   )
    //   console.log('seasonData', seasonData)

    //   if (seasonData) {
    //     teamIds = seasonData.teams.map((team) => team._id.toString())
    //   }
    // }

    // console.log('teamIds', teamIds)
    // if (teamIds.length > 0) {
    //   query.$or = [
    //     { homeTeam: { $in: teamIds } },
    //     { awayTeam: { $in: teamIds } }
    //   ]
    // }
    console.log('QUERY', query)
    const matches = await Match.find(query)
      .sort({ date: -1 })
      .populate('homeTeam awayTeam')
      .populate('seasonYear', 'year')

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
            stats[statistic].received.overRanges = determineRanges([40.5, 99.5], 5)
            stats[statistic].scored.overRanges = determineRanges([40.5, 99.5], 5)
            break
          case 'goals':
            stats[statistic].received.overRanges = determineRanges([0.5, 6.5], 1)
            stats[statistic].scored.overRanges = determineRanges([0.5, 6.5], 1)
            stats[statistic].total.overRanges = determineRanges([2.5, 11.5], 1)
            break
          case 'corners':
            stats[statistic].total.overRanges = determineRanges([10.5, 20.5], 2)
            stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
            stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
            break
          case 'offsides':
            stats[statistic].total.overRanges = determineRanges([8.5, 16.5], 2)
            stats[statistic].received.overRanges = determineRanges([6.5, 11.5], 1)
            stats[statistic].scored.overRanges = determineRanges([6.5, 11.5], 1)
            break
          case 'yellowCards':
            stats[statistic].total.overRanges = determineRanges([3.5, 8.5], 1)
            stats[statistic].received.overRanges = determineRanges([1.5, 5.5], 1)
            stats[statistic].scored.overRanges = determineRanges([1.5, 5.5], 1)
            break
          case 'shots':
            stats[statistic].total.overRanges = determineRanges([18.5, 30.5], 2)
            stats[statistic].received.overRanges = determineRanges([7.5, 16.5], 2)
            stats[statistic].scored.overRanges = determineRanges([7.5, 16.5], 2)
            break
          case 'shotsOnTarget':
            stats[statistic].total.overRanges = determineRanges([5.5, 16.5], 2)
            stats[statistic].received.overRanges = determineRanges([3.5, 8.5], 1)
            stats[statistic].scored.overRanges = determineRanges([3.5, 8.5], 1)
            break
          default:
            break
        }

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

              overRanges[rangeKey].percentage =
                (overCount / totalMatches) * 100
              underRanges[rangeKey].percentage =
                (underCount / totalMatches) * 100
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
      return {
        teamId,
        team,
        stats
      }
    })

    const results = await Promise.all(teamPromises)

    let allStats = results.map(({ team, stats }) => ({
      team,
      stats
    }))
    if (booleanIncludeAllSeasonMatches) {
      allStats = allStats.filter(stat => teamIds.includes(stat.team._id.toString()))
    }

    return res.status(200).json(allStats)
  } catch (error) {
    console.error('Error fetching matches:', error)
    res.status(500).send('An error occurred while fetching matches')
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

const getTeamStatsForSeason = async (req, res) => {
  const { seasonId } = req.params
  try {
    // Buscar todos los partidos de la temporada especificada que estén finalizados
    const matches = await Match.find({
      seasonYear: seasonId,
      isFinished: true
    }).populate('homeTeam awayTeam')

    // Objeto para almacenar las estadísticas de cada equipo
    const teamStats = {}

    // Función auxiliar para inicializar las estadísticas de un equipo
    const initializeTeamStats = (teamName) => ({
      team: teamName,
      statistics: {
        goals: { values: [], total: 0 },
        offsides: { values: [], total: 0 },
        yellowCards: { values: [], total: 0 },
        redCards: { values: [], total: 0 },
        corners: { values: [], total: 0 },
        shots: { values: [], total: 0 },
        shotsOnTarget: { values: [], total: 0 },
        possession: { values: [], total: 0 },
        fouls: { values: [], total: 0 }
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
        fouls: { values: [], total: 0 }
      }
    })

    // Iterar sobre cada partido y acumular las estadísticas
    matches.forEach((match) => {
      // Acumular estadísticas del equipo local
      const homeTeamId = match.homeTeam._id
      const homeTeamName = match.homeTeam.name
      if (!teamStats[homeTeamId]) {
        teamStats[homeTeamId] = initializeTeamStats(homeTeamName)
      }
      const {
        goals: localGoals,
        offsides: localOffsides,
        yellowCards: localYellowCards,
        redCards: localRedCards,
        corners: localCorners,
        shots: localShots,
        shotsOnTarget: localShotsOnTarget,
        possession: localPossession,
        foults: localFouls
      } = match.teamStatistics.local
      teamStats[homeTeamId].statistics.goals.values.push(localGoals || 0)
      teamStats[homeTeamId].statistics.goals.total += localGoals || 0
      teamStats[homeTeamId].statistics.offsides.values.push(localOffsides || 0)
      teamStats[homeTeamId].statistics.offsides.total += localOffsides || 0
      teamStats[homeTeamId].statistics.yellowCards.values.push(
        localYellowCards || 0
      )
      teamStats[homeTeamId].statistics.yellowCards.total +=
        localYellowCards || 0
      teamStats[homeTeamId].statistics.redCards.values.push(localRedCards || 0)
      teamStats[homeTeamId].statistics.redCards.total += localRedCards || 0
      teamStats[homeTeamId].statistics.corners.values.push(localCorners || 0)
      teamStats[homeTeamId].statistics.corners.total += localCorners || 0
      teamStats[homeTeamId].statistics.shots.values.push(localShots || 0)
      teamStats[homeTeamId].statistics.shots.total += localShots || 0
      teamStats[homeTeamId].statistics.shotsOnTarget.values.push(
        localShotsOnTarget || 0
      )
      teamStats[homeTeamId].statistics.shotsOnTarget.total +=
        localShotsOnTarget || 0
      teamStats[homeTeamId].statistics.possession.values.push(
        localPossession || 0
      )
      teamStats[homeTeamId].statistics.possession.total += localPossession || 0
      teamStats[homeTeamId].statistics.fouls.values.push(localFouls || 0)
      teamStats[homeTeamId].statistics.fouls.total += localFouls || 0

      // Acumular estadísticas recibidas del equipo local
      const {
        goals: visitorGoals,
        offsides: visitorOffsides,
        yellowCards: visitorYellowCards,
        redCards: visitorRedCards,
        corners: visitorCorners,
        shots: visitorShots,
        shotsOnTarget: visitorShotsOnTarget,
        possession: visitorPossession,
        foults: visitorFouls
      } = match.teamStatistics.visitor
      teamStats[homeTeamId].received.goals.values.push(visitorGoals || 0)
      teamStats[homeTeamId].received.goals.total += visitorGoals || 0
      teamStats[homeTeamId].received.offsides.values.push(visitorOffsides || 0)
      teamStats[homeTeamId].received.offsides.total += visitorOffsides || 0
      teamStats[homeTeamId].received.yellowCards.values.push(
        visitorYellowCards || 0
      )
      teamStats[homeTeamId].received.yellowCards.total +=
        visitorYellowCards || 0
      teamStats[homeTeamId].received.redCards.values.push(visitorRedCards || 0)
      teamStats[homeTeamId].received.redCards.total += visitorRedCards || 0
      teamStats[homeTeamId].received.corners.values.push(visitorCorners || 0)
      teamStats[homeTeamId].received.corners.total += visitorCorners || 0
      teamStats[homeTeamId].received.shots.values.push(visitorShots || 0)
      teamStats[homeTeamId].received.shots.total += visitorShots || 0
      teamStats[homeTeamId].received.shotsOnTarget.values.push(
        visitorShotsOnTarget || 0
      )
      teamStats[homeTeamId].received.shotsOnTarget.total +=
        visitorShotsOnTarget || 0
      teamStats[homeTeamId].received.possession.values.push(
        visitorPossession || 0
      )
      teamStats[homeTeamId].received.possession.total += visitorPossession || 0
      teamStats[homeTeamId].received.fouls.values.push(visitorFouls || 0)
      teamStats[homeTeamId].received.fouls.total += visitorFouls || 0

      // Acumular estadísticas del equipo visitante
      const awayTeamId = match.awayTeam._id
      const awayTeamName = match.awayTeam.name
      if (!teamStats[awayTeamId]) {
        teamStats[awayTeamId] = initializeTeamStats(awayTeamName)
      }
      teamStats[awayTeamId].statistics.goals.values.push(visitorGoals || 0)
      teamStats[awayTeamId].statistics.goals.total += visitorGoals || 0
      teamStats[awayTeamId].statistics.offsides.values.push(
        visitorOffsides || 0
      )
      teamStats[awayTeamId].statistics.offsides.total += visitorOffsides || 0
      teamStats[awayTeamId].statistics.yellowCards.values.push(
        visitorYellowCards || 0
      )
      teamStats[awayTeamId].statistics.yellowCards.total +=
        visitorYellowCards || 0
      teamStats[awayTeamId].statistics.redCards.values.push(
        visitorRedCards || 0
      )
      teamStats[awayTeamId].statistics.redCards.total += visitorRedCards || 0
      teamStats[awayTeamId].statistics.corners.values.push(visitorCorners || 0)
      teamStats[awayTeamId].statistics.corners.total += visitorCorners || 0
      teamStats[awayTeamId].statistics.shots.values.push(visitorShots || 0)
      teamStats[awayTeamId].statistics.shots.total += visitorShots || 0
      teamStats[awayTeamId].statistics.shotsOnTarget.values.push(
        visitorShotsOnTarget || 0
      )
      teamStats[awayTeamId].statistics.shotsOnTarget.total +=
        visitorShotsOnTarget || 0
      teamStats[awayTeamId].statistics.possession.values.push(
        visitorPossession || 0
      )
      teamStats[awayTeamId].statistics.possession.total +=
        visitorPossession || 0
      teamStats[awayTeamId].statistics.fouls.values.push(visitorFouls || 0)
      teamStats[awayTeamId].statistics.fouls.total += visitorFouls || 0

      // Acumular estadísticas recibidas del equipo visitante
      teamStats[awayTeamId].received.goals.values.push(localGoals || 0)
      teamStats[awayTeamId].received.goals.total += localGoals || 0
      teamStats[awayTeamId].received.offsides.values.push(localOffsides || 0)
      teamStats[awayTeamId].received.offsides.total += localOffsides || 0
      teamStats[awayTeamId].received.yellowCards.values.push(
        localYellowCards || 0
      )
      teamStats[awayTeamId].received.yellowCards.total += localYellowCards || 0
      teamStats[awayTeamId].received.redCards.values.push(localRedCards || 0)
      teamStats[awayTeamId].received.redCards.total += localRedCards || 0
      teamStats[awayTeamId].received.corners.values.push(localCorners || 0)
      teamStats[awayTeamId].received.corners.total += localCorners || 0
      teamStats[awayTeamId].received.shots.values.push(localShots || 0)
      teamStats[awayTeamId].received.shots.total += localShots || 0
      teamStats[awayTeamId].received.shotsOnTarget.values.push(
        localShotsOnTarget || 0
      )
      teamStats[awayTeamId].received.shotsOnTarget.total +=
        localShotsOnTarget || 0
      teamStats[awayTeamId].received.possession.values.push(
        localPossession || 0
      )
      teamStats[awayTeamId].received.possession.total += localPossession || 0
      teamStats[awayTeamId].received.fouls.values.push(localFouls || 0)
      teamStats[awayTeamId].received.fouls.total += localFouls || 0
    })

    // Función para calcular la mediana, el promedio y la desviación estándar usando simple-statistics
    const calculateStats = (values) => {
      if (values.length === 0) {
        return { promedio: 0, mediana: 0, desviacion: 0 }
      }

      const promedio = parseFloat(ss.mean(values).toFixed(1))
      const mediana = parseFloat(ss.median(values).toFixed(1))
      const desviacion = parseFloat(ss.standardDeviation(values).toFixed(1))

      return { promedio, mediana, desviacion }
    }
    // Añadir estadísticas calculadas a cada equipo
    Object.values(teamStats).forEach((team) => {
      Object.keys(team.statistics).forEach((statKey) => {
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

    // Convertir el objeto de estadísticas de equipos a un array de objetos
    const teamStatsArray = Object.keys(teamStats).map((teamId) => ({
      teamId,
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

// const getTeamStatsForSeason = async (req, res) => {
//   const { seasonId } = req.params
//   try {
//     // Buscar todos los partidos de la temporada especificada
//     const matches = await Match.find({ seasonYear: seasonId }).populate(
//       'homeTeam awayTeam'
//     )

//     // Objeto para almacenar las estadísticas de cada equipo
//     const teamStats = {}

//     // Iterar sobre cada partido y acumular las estadísticas
//     matches.forEach((match) => {
//       // Acumular estadísticas del equipo local
//       const homeTeamId = match.homeTeam._id
//       const homeTeamName = match.homeTeam.name
//       if (!teamStats[homeTeamId]) {
//         teamStats[homeTeamId] = {
//           team: homeTeamName,
//           goals: 0,
//           offsides: 0,
//           yellowCards: 0,
//           redCards: 0,
//           corners: 0
//         }
//       }
//       const {
//         goals: localGoals,
//         offsides: localOffsides,
//         yellowCards: localYellowCards,
//         redCards: localRedCards,
//         corners: localCorners
//       } = match.teamStatistics.local
//       teamStats[homeTeamId].goals += localGoals || 0
//       teamStats[homeTeamId].offsides += localOffsides || 0
//       teamStats[homeTeamId].yellowCards += localYellowCards || 0
//       teamStats[homeTeamId].redCards += localRedCards || 0
//       teamStats[homeTeamId].corners += localCorners || 0

//       // Acumular estadísticas del equipo visitante
//       const awayTeamId = match.awayTeam._id
//       const awayTeamName = match.awayTeam.name
//       if (!teamStats[awayTeamId]) {
//         teamStats[awayTeamId] = {
//           team: awayTeamName,
//           goals: 0,
//           offsides: 0,
//           yellowCards: 0,
//           redCards: 0,
//           corners: 0
//         }
//       }
//       const {
//         goals: visitorGoals,
//         offsides: visitorOffsides,
//         yellowCards: visitorYellowCards,
//         redCards: visitorRedCards,
//         corners: visitorCorners
//       } = match.teamStatistics.visitor
//       teamStats[awayTeamId].goals += visitorGoals || 0
//       teamStats[awayTeamId].offsides += visitorOffsides || 0
//       teamStats[awayTeamId].yellowCards += visitorYellowCards || 0
//       teamStats[awayTeamId].redCards += visitorRedCards || 0
//       teamStats[awayTeamId].corners += visitorCorners || 0
//     })

//     // Convertir el objeto de estadísticas de equipos a un array de objetos
//     const teamStatsArray = Object.keys(teamStats).map((teamId) => ({
//       teamId,
//       teamName: teamStats[teamId].team,
//       statistics: {
//         goals: teamStats[teamId].goals,
//         offsides: teamStats[teamId].offsides,
//         yellowCards: teamStats[teamId].yellowCards,
//         redCards: teamStats[teamId].redCards,
//         corners: teamStats[teamId].corners
//       }
//     }))

//     res.json(teamStatsArray)
//   } catch (error) {
//     console.error('Error fetching team statistics for season:', error)
//     res
//       .status(500)
//       .json({
//         error: 'An error occurred while fetching team statistics for season'
//       })
//   }
// }

// Controlador para eliminar un partido por su ID
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
  getAllTeamsStats
}
