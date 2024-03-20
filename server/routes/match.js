import { Router } from 'express'
import { Match } from '../../schemas/match.js'
import { Team } from '../../schemas/team.js'

export const matchRouter = Router()

matchRouter.get('/', async (req, res) => {
  try {
    const match = await Match.find().populate('homeTeam awayTeam')
    res.send(match)
  } catch (error) {
    res.status(500).send(error)
  }
})

matchRouter.post('/', async (req, res) => {
  try {
    const { homeTeamName, awayTeamName, date } = req.body

    // Buscar los IDs de los equipos en la base de datos
    const homeTeam = await Team.findOne({ name: homeTeamName })
    const awayTeam = await Team.findOne({ name: awayTeamName })

    if (!homeTeam || !awayTeam) {
      return res.status(400).send('Uno o ambos equipos no existen en la base de datos')
    }

    // Crear un nuevo partido con los IDs encontrados y la fecha proporcionada
    const match = new Match({ homeTeam: homeTeam._id, awayTeam: awayTeam._id, date })
    await match.save()

    // Obtener toda la información de los equipos y agregarla a la respuesta
    const populatedMatch = await match.populate('homeTeam awayTeam')
    console.log('Partido creado:', populatedMatch)

    res.status(201).send(populatedMatch)
  } catch (error) {
    console.error('Error al crear el partido:', error)
    res.status(500).send('Error al crear el partido')
  }
})

matchRouter.put('/:id/result', async (req, res) => {
  try {
    const { goalsHome, goalsAway, stats } = req.body
    const matchId = req.params.id

    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).send('Partido no encontrado')
    }

    // Actualizar estadísticas del equipo local
    match.teamStatistics.local.goals = stats.local.goals
    match.teamStatistics.local.offsides = stats.local.offsides
    match.teamStatistics.local.yellowCards = stats.local.yellowCards
    match.teamStatistics.local.redCards = stats.local.redCards
    match.teamStatistics.local.corners = stats.local.corners

    // Actualizar estadísticas del equipo visitante
    match.teamStatistics.visitor.goals = stats.visitor.goals
    match.teamStatistics.visitor.offsides = stats.visitor.offsides
    match.teamStatistics.visitor.yellowCards = stats.visitor.yellowCards
    match.teamStatistics.visitor.redCards = stats.visitor.redCards
    match.teamStatistics.visitor.corners = stats.visitor.corners

    // Actualizar resultado del partido
    match.goalsHome = goalsHome
    match.goalsAway = goalsAway
    match.isFinished = true

    await match.save()
    res.status(200).send(match)
  } catch (error) {
    res.status(400).send(error)
  }
})

// Ruta para obtener un partido por su ID
matchRouter.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
    if (!match) {
      return res.status(404).send()
    }
    res.send(match)
  } catch (error) {
    res.status(500).send(error)
  }
})

// Obtener todos los partidos de un equipo
matchRouter.get('/team/:idTeam', async (req, res) => {
  try {
    const idTeam = req.params.idTeam

    // Buscar todos los partidos en los que el equipo participó como local
    const homeMatches = await Match.find({ homeTeam: idTeam }).populate('homeTeam awayTeam')

    // Buscar todos los partidos en los que el equipo participó como visitante
    const awayMatches = await Match.find({ awayTeam: idTeam }).populate('homeTeam awayTeam')

    // Combinar los partidos como local y como visitante en una sola lista
    const allMatches = [...homeMatches, ...awayMatches]

    res.status(200).send(allMatches)
  } catch (error) {
    console.error('Error al buscar los partidos del equipo:', error)
    res.status(500).send('Error al buscar los partidos del equipo')
  }
})

// matchRouter.get('/stats/:idTeam', async (req, res) => {
//   try {
//     const idTeam = req.params.idTeam
//     const nameTeam = await Team.findById(idTeam)

//     // Obtener todos los partidos del equipo como local y como visitante
//     const homeMatches = await Match.find({ homeTeam: idTeam })
//     const awayMatches = await Match.find({ awayTeam: idTeam })

//     // Función para calcular las estadísticas
//     const calculateStats = (matches, statType) => {
//       const stats = {
//         matchesTotal: matches.length,
//         matchesWith0: 0,
//         matchesWith1: 0,
//         matchesWith2: 0,
//         matchesWith3: 0,
//         matchesWith4: 0,
//         matchesWith5: 0,
//         matchesWith6: 0,
//         matchesWith7: 0,
//         matchesWith8: 0,
//         matchesWith9: 0,
//         matchesWith10: 0,
//         matchesWithMoreThan10: 0
//       }

//       matches.forEach(match => {
//         const teamStats = match.homeTeam.equals(idTeam) ? match.teamStatistics.local : match.teamStatistics.visitor
//         const statValue = teamStats[statType]
//         if (statValue <= 10) {
//           stats[`matchesWith${statValue}`]++
//         } else {
//           stats.matchesWithMoreThan10++
//         }
//       })

//       return stats
//     }

//     // Calcular estadísticas para cada tipo de estadística
//     const statsGoles = calculateStats([...homeMatches, ...awayMatches], 'goals')
//     const statsOffsides = calculateStats([...homeMatches, ...awayMatches], 'offsides')
//     const statsYellowCards = calculateStats([...homeMatches, ...awayMatches], 'yellowCards')
//     const statsRedCards = calculateStats([...homeMatches, ...awayMatches], 'redCards')
//     const statsGolesRecibidos = calculateStats([...homeMatches, ...awayMatches], 'goalsReceived')

//     // Devolver los resultados en un solo objeto
//     const allStats = {
//       team: nameTeam.name,
//       goals: statsGoles,
//       goalsReceived: statsGolesRecibidos,
//       offsides: statsOffsides,
//       yellowCards: statsYellowCards,
//       redCards: statsRedCards
//     }

//     res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error al obtener estadísticas del equipo:', error)
//     res.status(500).send('Error al obtener estadísticas del equipo')
//   }
// })
matchRouter.get('/stats/:idTeam', async (req, res) => {
  try {
    const idTeam = req.params.idTeam
    const nameTeam = await Team.findById(idTeam)

    // Obtener todos los partidos del equipo como local y como visitante
    const homeMatches = await Match.find({ homeTeam: idTeam })
    const awayMatches = await Match.find({ awayTeam: idTeam })

    // Función para calcular las estadísticas
    const calculateStats = (matches, statType, isHomeTeam) => {
      const stats = {
        matchesTotal: matches.length,
        matchesWith0: 0,
        matchesWith1: 0,
        matchesWith2: 0,
        matchesWith3: 0,
        matchesWith4: 0,
        matchesWith5: 0,
        matchesWith6: 0,
        matchesWith7: 0,
        matchesWith8: 0,
        matchesWith9: 0,
        matchesWith10: 0,
        matchesWithMoreThan10: 0
      }

      matches.forEach(match => {
        const teamStats = isHomeTeam ? match.teamStatistics.local : match.teamStatistics.visitor
        const statValue = teamStats[statType]
        if (statValue <= 10) {
          stats[`matchesWith${statValue}`]++
        } else {
          stats.matchesWithMoreThan10++
        }
      })

      return stats
    }

    // Calcular estadísticas para cada tipo de estadística
    const statsGoles = calculateStats([...homeMatches, ...awayMatches], 'goals', true)
    const statsOffsides = calculateStats([...homeMatches, ...awayMatches], 'offsides', true)
    const statsYellowCards = calculateStats([...homeMatches, ...awayMatches], 'yellowCards', true)
    const statsRedCards = calculateStats([...homeMatches, ...awayMatches], 'redCards', true)
    const statsCorners = calculateStats([...homeMatches, ...awayMatches], 'corners', true)

    // Calcular los goles recibidos sumando los goles marcados por el equipo contrario en cada partido
    const statsGolesRecibidosLocal = calculateStats(awayMatches, 'goals', true)
    const statsGolesRecibidosVisitante = calculateStats(homeMatches, 'goals', false)
    const statsGolesRecibidos = {
      matchesTotal: statsGolesRecibidosLocal.matchesTotal + statsGolesRecibidosVisitante.matchesTotal,
      matchesWith0: statsGolesRecibidosLocal.matchesWith0 + statsGolesRecibidosVisitante.matchesWith0,
      matchesWith1: statsGolesRecibidosLocal.matchesWith1 + statsGolesRecibidosVisitante.matchesWith1,
      matchesWith2: statsGolesRecibidosLocal.matchesWith2 + statsGolesRecibidosVisitante.matchesWith2,
      matchesWith3: statsGolesRecibidosLocal.matchesWith3 + statsGolesRecibidosVisitante.matchesWith3,
      matchesWith4: statsGolesRecibidosLocal.matchesWith4 + statsGolesRecibidosVisitante.matchesWith4,
      matchesWith5: statsGolesRecibidosLocal.matchesWith5 + statsGolesRecibidosVisitante.matchesWith5,
      matchesWith6: statsGolesRecibidosLocal.matchesWith6 + statsGolesRecibidosVisitante.matchesWith6,
      matchesWith7: statsGolesRecibidosLocal.matchesWith7 + statsGolesRecibidosVisitante.matchesWith7,
      matchesWith8: statsGolesRecibidosLocal.matchesWith8 + statsGolesRecibidosVisitante.matchesWith8,
      matchesWith9: statsGolesRecibidosLocal.matchesWith9 + statsGolesRecibidosVisitante.matchesWith9,
      matchesWith10: statsGolesRecibidosLocal.matchesWith10 + statsGolesRecibidosVisitante.matchesWith10,
      matchesWithMoreThan10: statsGolesRecibidosLocal.matchesWithMoreThan10 + statsGolesRecibidosVisitante.matchesWithMoreThan10
    }

    // Devolver los resultados en un solo objeto
    const allStats = {
      team: nameTeam.name,
      goals: statsGoles,
      goalsReceived: statsGolesRecibidos,
      offsides: statsOffsides,
      yellowCards: statsYellowCards,
      redCards: statsRedCards,
      corners: statsCorners
    }

    res.status(200).json(allStats)
  } catch (error) {
    console.error('Error al obtener estadísticas del equipo:', error)
    res.status(500).send('Error al obtener estadísticas del equipo')
  }
})

// matchRouter.get('/statsAc/:idTeam', async (req, res) => {
//   try {
//     const idTeam = req.params.idTeam
//     const nameTeam = await Team.findById(idTeam)

//     // Obtener todos los partidos del equipo como local y como visitante
//     const homeMatches = await Match.find({ homeTeam: idTeam, isFinished: true })
//     const awayMatches = await Match.find({ awayTeam: idTeam, isFinished: true })

//     // Función para calcular las estadísticas
//     const calculateStats = (matches, statType) => {
//       // Inicializar contadores para los diferentes rangos
//       const stats = {
//         matchesTotal: matches.length,
//         matchesWith0_5: 0,
//         matchesWith1_5: 0,
//         matchesWith2_5: 0,
//         matchesWith3_5: 0,
//         matchesWith4_5: 0,
//         matchesWith5_5: 0,
//         matchesWith6_5: 0,
//         matchesWith7_5: 0,
//         matchesWith8_5: 0,
//         matchesWith9_5: 0
//       }

//       // Función para verificar si un valor excede un cierto umbral
//       const exceedsThreshold = (value, threshold) => {
//         return value > threshold
//       }

//       // Contar el número de partidos que superan cada umbral
//       matches.forEach(match => {
//         const teamStats = match.teamStatistics.local
//         const statValue = teamStats[statType]

//         if (exceedsThreshold(statValue, 0.5)) {
//           stats.matchesWith0_5++
//         }
//         if (exceedsThreshold(statValue, 1.5)) {
//           stats.matchesWith1_5++
//         }
//         if (exceedsThreshold(statValue, 2.5)) {
//           stats.matchesWith2_5++
//         }
//         if (exceedsThreshold(statValue, 3.5)) {
//           stats.matchesWith3_5++
//         }
//         if (exceedsThreshold(statValue, 4.5)) {
//           stats.matchesWith4_5++
//         }
//         if (exceedsThreshold(statValue, 5.5)) {
//           stats.matchesWith5_5++
//         }
//         if (exceedsThreshold(statValue, 6.5)) {
//           stats.matchesWith6_5++
//         }
//         if (exceedsThreshold(statValue, 7.5)) {
//           stats.matchesWith7_5++
//         }
//         if (exceedsThreshold(statValue, 8.5)) {
//           stats.matchesWith8_5++
//         }
//         if (exceedsThreshold(statValue, 9.5)) {
//           stats.matchesWith9_5++
//         }
//       })

//       return stats
//     }

//     // Calcular estadísticas para cada tipo de estadística
//     const statsGoles = calculateStats([...homeMatches, ...awayMatches], 'goals')
//     const statsOffsides = calculateStats([...homeMatches, ...awayMatches], 'offsides')
//     const statsYellowCards = calculateStats([...homeMatches, ...awayMatches], 'yellowCards')
//     const statsRedCards = calculateStats([...homeMatches, ...awayMatches], 'redCards')
//     const statsCorners = calculateStats([...homeMatches, ...awayMatches], 'corners')

//     // Devolver los resultados
//     const allStats = {
//       team: nameTeam.name,
//       goals: statsGoles,
//       offsides: statsOffsides,
//       yellowCards: statsYellowCards,
//       redCards: statsRedCards,
//       corners: statsCorners
//     }

//     res.status(200).json(allStats)
//   } catch (error) {
//     console.error('Error al obtener estadísticas del equipo:', error)
//     res.status(500).send('Error al obtener estadísticas del equipo')
//   }
// })

matchRouter.get('/statsAc/:idTeam', async (req, res) => {
  try {
    const idTeam = req.params.idTeam
    const { matchesCount = 5, homeOnly = false, awayOnly = false } = req.query // Obtener parámetros opcionales de la consulta

    const booleanHomeOnly = homeOnly === 'true'
    const booleanAwayOnly = awayOnly === 'true'

    let query = { isFinished: true }

    if (booleanHomeOnly && !booleanAwayOnly) {
      query = { ...query, homeTeam: idTeam }
    } else if (booleanAwayOnly && !booleanHomeOnly) {
      query = { ...query, awayTeam: idTeam }
    } else if (booleanHomeOnly && booleanAwayOnly) {
      query = { ...query, $or: [{ homeTeam: idTeam }, { awayTeam: idTeam }] }
    } else {
      return
    }
    console.log(booleanHomeOnly, booleanAwayOnly)
    console.log(query)
    const matches = await Match.find(query)
      .sort({ date: -1 }) // Ordenar por fecha de manera descendente
      .limit(parseInt(matchesCount))
      .populate('homeTeam awayTeam')

    // Función para calcular las estadísticas
    const calculateStats = (matches, statType) => {
      const stats = {
        matchesTotalFinished: matches.length,
        matchesWith0: 0,
        matchesWith0_5: 0,
        matchesWith1_5: 0,
        matchesWith2_5: 0,
        matchesWith3_5: 0,
        matchesWith4_5: 0,
        matchesWith5_5: 0,
        matchesWith6_5: 0,
        matchesWith7_5: 0,
        matchesWith8_5: 0,
        matchesWith9_5: 0
      }

      matches.forEach(match => {
        const teamStats = match.homeTeam.equals(idTeam) ? match.teamStatistics.local : match.teamStatistics.visitor
        const statValue = teamStats[statType]
        if (statValue >= 0.5 && statValue <= 9.5) {
          const floorValue = Math.floor(statValue)
          stats[`matchesWith${floorValue}_5`]++
        } else if (statValue >= 9.5) {
          stats.matchesWith9_5++
        } else if (statValue === 0) {
          stats.matchesWith0++
        }
      })
      return stats
    }

    // Calcular estadísticas para cada tipo de estadística
    const statsGoles = calculateStats(matches, 'goals')
    const statsOffsides = calculateStats(matches, 'offsides')
    const statsYellowCards = calculateStats(matches, 'yellowCards')
    const statsRedCards = calculateStats(matches, 'redCards')
    const statsCorners = calculateStats(matches, 'corners')

    // Devolver los resultados en un solo objeto
    const allStats = {
      matchesCount,
      homeOnly,
      awayOnly,
      goals: statsGoles,
      offsides: statsOffsides,
      yellowCards: statsYellowCards,
      redCards: statsRedCards,
      corners: statsCorners
    }

    res.status(200).json(allStats)
  } catch (error) {
    console.error('Error al obtener estadísticas del equipo:', error)
    res.status(500).send('Error al obtener estadísticas del equipo')
  }
})
