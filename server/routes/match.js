import { Router } from 'express'
import { Match } from '../../schemas/match.js'
import { Team } from '../../schemas/team.js'

export const matchRouter = Router()

matchRouter.get('/', async (req, res) => {
  try {
    const query = {}

    // Agregar condiciones según los parámetros de consulta
    if (req.query.isFinished) {
      query.isFinished = req.query.isFinished === 'true' // Convierte la cadena "true" a un booleano true
    }

    if (req.query.league) {
      query.league = req.query.league
    }

    if (req.query.seasonYear) {
      query.seasonYear = req.query.seasonYear
    }

    if (req.query.matchDate) {
      query.matchDate = req.query.matchDate
    }

    if (req.query.seasonYear) {
      query.seasonYear = req.query.seasonYear
    }

    const match = await Match.find(query).populate('homeTeam awayTeam')
    res.send(match)
  } catch (error) {
    res.status(500).send(error)
  }
})

matchRouter.post('/', async (req, res) => {
  try {
    const { homeTeamName, awayTeamName, date, league, seasonYear, matchDate } =
      req.body

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
      league,
      seasonYear,
      matchDate
    })
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
    const homeMatches = await Match.find({ homeTeam: idTeam }).populate(
      'homeTeam awayTeam'
    )

    // Buscar todos los partidos en los que el equipo participó como visitante
    const awayMatches = await Match.find({ awayTeam: idTeam }).populate(
      'homeTeam awayTeam'
    )

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

      matches.forEach((match) => {
        const teamStats = isHomeTeam
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
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
    const statsGoles = calculateStats(
      [...homeMatches, ...awayMatches],
      'goals',
      true
    )
    const statsOffsides = calculateStats(
      [...homeMatches, ...awayMatches],
      'offsides',
      true
    )
    const statsYellowCards = calculateStats(
      [...homeMatches, ...awayMatches],
      'yellowCards',
      true
    )
    const statsRedCards = calculateStats(
      [...homeMatches, ...awayMatches],
      'redCards',
      true
    )
    const statsCorners = calculateStats(
      [...homeMatches, ...awayMatches],
      'corners',
      true
    )

    // Calcular los goles recibidos sumando los goles marcados por el equipo contrario en cada partido
    const statsGolesRecibidosLocal = calculateStats(awayMatches, 'goals', true)
    const statsGolesRecibidosVisitante = calculateStats(
      homeMatches,
      'goals',
      false
    )
    const statsGolesRecibidos = {
      matchesTotal:
        statsGolesRecibidosLocal.matchesTotal +
        statsGolesRecibidosVisitante.matchesTotal,
      matchesWith0:
        statsGolesRecibidosLocal.matchesWith0 +
        statsGolesRecibidosVisitante.matchesWith0,
      matchesWith1:
        statsGolesRecibidosLocal.matchesWith1 +
        statsGolesRecibidosVisitante.matchesWith1,
      matchesWith2:
        statsGolesRecibidosLocal.matchesWith2 +
        statsGolesRecibidosVisitante.matchesWith2,
      matchesWith3:
        statsGolesRecibidosLocal.matchesWith3 +
        statsGolesRecibidosVisitante.matchesWith3,
      matchesWith4:
        statsGolesRecibidosLocal.matchesWith4 +
        statsGolesRecibidosVisitante.matchesWith4,
      matchesWith5:
        statsGolesRecibidosLocal.matchesWith5 +
        statsGolesRecibidosVisitante.matchesWith5,
      matchesWith6:
        statsGolesRecibidosLocal.matchesWith6 +
        statsGolesRecibidosVisitante.matchesWith6,
      matchesWith7:
        statsGolesRecibidosLocal.matchesWith7 +
        statsGolesRecibidosVisitante.matchesWith7,
      matchesWith8:
        statsGolesRecibidosLocal.matchesWith8 +
        statsGolesRecibidosVisitante.matchesWith8,
      matchesWith9:
        statsGolesRecibidosLocal.matchesWith9 +
        statsGolesRecibidosVisitante.matchesWith9,
      matchesWith10:
        statsGolesRecibidosLocal.matchesWith10 +
        statsGolesRecibidosVisitante.matchesWith10,
      matchesWithMoreThan10:
        statsGolesRecibidosLocal.matchesWithMoreThan10 +
        statsGolesRecibidosVisitante.matchesWithMoreThan10
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

/// //////////////////////
// matchRouter.get('/statsAc/:idTeam', async (req, res) => {
//   try {
//     const idTeam = req.params.idTeam
//     const {
//       statistic,
//       matchesCount = 5,
//       homeOnly = false,
//       awayOnly = false,
//       lowerLimit,
//       upperLimit
//     } = req.query
//     console.log('MINIMO', lowerLimit)
//     const booleanHomeOnly = homeOnly === 'true'
//     const booleanAwayOnly = awayOnly === 'true'

//     let query = { isFinished: true }

//     if (booleanHomeOnly && !booleanAwayOnly) {
//       query = { ...query, homeTeam: idTeam }
//     } else if (booleanAwayOnly && !booleanHomeOnly) {
//       query = { ...query, awayTeam: idTeam }
//     } else if (booleanHomeOnly && booleanAwayOnly) {
//       query = { ...query, $or: [{ homeTeam: idTeam }, { awayTeam: idTeam }] }
//     } else {
//       return
//     }

//     if (lowerLimit && upperLimit) {
//       query = {
//         ...query,
//         $or: [
//           {
//             [`teamStatistics.local.${statistic}`]: {
//               $gte: parseFloat(lowerLimit),
//               $lte: parseFloat(upperLimit)
//             }
//           },
//           {
//             [`teamStatistics.visitor.${statistic}`]: {
//               $gte: parseFloat(lowerLimit),
//               $lte: parseFloat(upperLimit)
//             }
//           }
//         ]
//       }
//     }

//     const matches = await Match.find(query)
//       .sort({ date: -1 })
//       .limit(parseInt(matchesCount))
//       .populate('homeTeam awayTeam')

//     const team = await Team.findById(idTeam)

//     // const generateStats = (matches, statistic, lowerLimit, upperLimit) => {
//     //   const stats = {
//     //     matchesTotalFinished: matches.length,
//     //     few: 0,
//     //     many: 0,
//     //     total: 0
//     //   }

//     //   const ranges = []
//     //   for (let i = parseFloat(lowerLimit); i <= parseFloat(upperLimit); i += 0.5) {
//     //     ranges.push(i)
//     //   }

//     //   ranges.forEach(range => {
//     //     const key = `matchesWith${range.toString().replace('.', '_')}`
//     //     stats[key] = 0
//     //   })

//     //   matches.forEach(match => {
//     //     const teamStats = match.homeTeam.equals(idTeam) ? match.teamStatistics.local : match.teamStatistics.visitor
//     //     const statValue = teamStats[statistic]

//     //     stats.total += statValue

//     //     ranges.forEach(range => {
//     //       const key = `matchesWith${range.toString().replace('.', '_')}`
//     //       if (statValue >= range) {
//     //         stats[key]++
//     //       }
//     //     })

//     //     if (statValue < lowerLimit) {
//     //       stats.few++
//     //     } else if (statValue > upperLimit) {
//     //       stats.many++
//     //     }
//     //   })

//     //   return stats
//     // }
//     const generateStats = (matches, statistic, lowerLimit, upperLimit) => {
//       const stats = {
//         matchesTotalFinished: matches.length,
//         few: 0,
//         many: 0,
//         total: 0
//       }

//       const ranges = []
//       for (let i = Math.floor(parseFloat(lowerLimit)); i <= Math.floor(parseFloat(upperLimit)); i++) {
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
//           if (statValue >= range) {
//             stats[key]++
//           }
//         })
//         if (statValue < lowerLimit) { // Si los goles son menores que el límite inferior, incrementar el contador de partidos con menos goles
//           stats.few++
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
//       matchesCount,
//       homeOnly,
//       awayOnly,
//       [statistic]: stats
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
    console.log('ID', idTeam)
    const {
      statistic,
      matchesCount = 5,
      homeOnly = true,
      awayOnly = true,
      lowerLimit,
      upperLimit,
      lessThan = false // Nuevo query para buscar partidos con menos de cierta cantidad
    } = req.query

    const booleanHomeOnly = homeOnly === 'true'
    const booleanAwayOnly = awayOnly === 'true'
    const boolenaLessThan = lessThan === 'true'
    let query = { isFinished: true }

    // si SOLO JUGADOS EN HOME PERO  NO VISITA
    if (booleanHomeOnly && !booleanAwayOnly) {
      query = { ...query, homeTeam: idTeam }
      /// SI VISITA PERO NO HOME
    } else if (booleanAwayOnly && !booleanHomeOnly) {
      query = { ...query, awayTeam: idTeam }
      // TANTO PARTIDOS LOCALES COMO VISITANTE
    } else if (booleanHomeOnly && booleanAwayOnly) {
      query = { ...query, $or: [{ homeTeam: idTeam }, { awayTeam: idTeam }] }
    } else {
      // Si no se especifican filtros de local y visitante, devolver estadísticas vacías
      const emptyStats = {
        matchesTotalFinished: 0,
        few: 0,
        many: 0,
        total: 0
        // Agrega otras estadísticas necesarias aquí y establece su valor en cero
      }
      const allStats = {
        teamId: idTeam,
        teamName: 'Nombre del Equipo', // Puedes establecer el nombre del equipo aquí
        matches: [], // No hay partidos para mostrar
        matchesCount: 0,
        homeOnly,
        awayOnly,
        [statistic]: emptyStats,
        lessThan
      }
      return res.status(200).json(allStats)
    }
    console.log(query)
    if (lowerLimit && upperLimit) {
      query = {
        ...query,
        $or: [
          {
            [`teamStatistics.local.${statistic}`]: { $gte: parseFloat(lowerLimit), $lte: parseFloat(upperLimit) } // Buscar valores dentro del rango
          },
          {
            [`teamStatistics.visitor.${statistic}`]: { $gte: parseFloat(lowerLimit), $lte: parseFloat(upperLimit) } // Buscar valores dentro del rango
          }
        ]

      }
    }

    const matches = await Match.find(query)
      .sort({ date: -1 })
      .limit(parseInt(matchesCount))
      .populate('homeTeam awayTeam')

    const team = await Team.findById(idTeam)

    console.log('ESTADISTICAS DE_', team, '-----', matches)
    // console.log('NOMBRE', team.name)
    // console.log('QUERY', query)
    const generateStats = (matches, statistic, lowerLimit, upperLimit) => {
      const stats = {
        matchesTotalFinished: matches?.length || 0,
        few: 0,
        many: 0,
        total: 0
      }

      const ranges = []
      for (let i = (parseFloat(lowerLimit)); i <= (parseFloat(upperLimit)); i++) {
        ranges.push(i)
      }

      ranges.forEach((range) => {
        const key = `matchesWith${range.toString().replace('.', '_')}`
        stats[key] = 0
      })

      matches.forEach((match) => {
        const teamStats = match.homeTeam.equals(idTeam)
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const statValue = teamStats[statistic]

        stats.total += statValue

        ranges.forEach((range) => {
          const key = `matchesWith${range.toString().replace('.', '_')}`
          if (boolenaLessThan) {
            // Si lessThan es true, contabiliza los partidos donde la estadística es menor que el rango
            if (statValue < range) {
              stats[key]++
            }
          } else {
            // Si lessThan es false, contabiliza los partidos donde la estadística es mayor o igual que el rango
            if (statValue > range) {
              stats[key]++
            }
          }
        })

        if (boolenaLessThan) {
          // Si lessThan es true, contabiliza los partidos donde la estadística es menor que el límite inferior
          if (statValue < lowerLimit) {
            stats.few++
          }
        } else {
          // Si lessThan es false, contabiliza los partidos donde la estadística es mayor o igual que el límite inferior
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

    const allStats = {
      teamId: team._id,
      teamName: team.name,
      matches,
      matchesCount,
      homeOnly,
      awayOnly,
      [statistic]: stats,
      lessThan // Agregar la propiedad lessThan al resultado
    }
    res.status(200).json(allStats)
  } catch (error) {
    console.error('Error al obtener estadísticas del equipo:', error)
    res.status(500).send('Error al obtener estadísticas del equipo')
  }
})
