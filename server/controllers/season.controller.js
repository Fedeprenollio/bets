// Importar los modelos necesarios
import { Season } from '../../schemas/seasonSchema.js'
import { League } from '../../schemas/leagueSchema.js'
import { Match } from '../../schemas/match.js'
import { Fecha } from '../../schemas/fechaSchema.js'
import { calculatePositionTables } from '../services/tablePositions.js'
import { Team } from '../../schemas/team.js'

// Controlador para crear una nueva temporada
const createSeason = async (req, res) => {
  try {
    const { leagueId, year, teams, matches, numberOfRounds } = req.body

    // Obtener la liga a la que se asociará la temporada
    const league = await League.findById(leagueId)

    const season = new Season({
      league: leagueId,
      year,
      teams,
      matches,
      numberOfRounds
    })
    await season.save()

    // Agregar la temporada a la lista de temporadas de la liga
    league.season.push(season)
    await league.save()

    res.status(201).json({ status: 201, state: 'ok', season })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para obtener todas las temporadas
const getAllSeasons = async (req, res) => {
  try {
    const seasons = await Season.find().populate('league').populate('fechas')
    res.json(seasons)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para obtener una temporada por su ID
const getSeasonById = async (req, res) => {
  const idSeason = req.params.id
  try {
    const season = await Season.findById(idSeason).populate([
      { path: 'teams' },
      {
        path: 'league',
        populate: {
          path: 'season'
        }
      },
      {
        path: 'fechas',
        populate: {
          path: 'matches',
          populate: [{ path: 'awayTeam' }, { path: 'homeTeam' }]
        }
      },
      {
        path: 'matches'
      },
      {
        path: 'positionTables.general'
      },
      {
        path: 'positionTables.home'
      },
      {
        path: 'positionTables.away'
      },
      {
        path: 'zones',
        populate: {
          path: 'positionTables.general'
        }
      }
    ])

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    // Ordenar las fechas por el campo "order" en orden creciente
    season.fechas.sort((a, b) => a.order - b.order)

    // Buscar la jornada actual de la temporada
    const currentFecha = season.fechas.find((fecha) => fecha.isCurrentFecha)

    // Ordenar las temporadas de la liga por el campo "year" en orden creciente
    season.league.season.sort((a, b) => {
      const yearA = parseInt(a.year.split('/')[0], 10)
      const yearB = parseInt(b.year.split('/')[0], 10)
      return yearA - yearB
    })

    res.json({ season, currentFecha })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para actualizar una temporada por su ID
const updateSeasonById = async (req, res) => {
  try {
    const updates = req.body // Obtener las actualizaciones del cuerpo de la solicitud

    // Buscar la temporada por su ID y actualizar los campos
    const season = await Season.findByIdAndUpdate(req.params.id, updates, {
      new: true, // Devolver la temporada actualizada
      runValidators: true // Ejecutar validaciones de mongoose
    }).populate('teams')

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    res.json({ status: 201, state: 'ok', season })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Ruta para marcar una temporada como la actual
const isCurrentSeason = async (req, res) => {
  const { seasonId, leagueId } = req.params

  try {
    // Buscar la liga para asegurarte de que la temporada pertenece a ella
    const selectedLeague = await League.findById(leagueId)

    // Si la liga no existe, devuelve un error
    if (!selectedLeague) {
      return res.status(404).json({ mensaje: 'La liga no existe' })
    }

    // Actualizar todas las temporadas de la liga para establecer "isCurrentSeason" a false
    await Season.updateMany({ league: leagueId }, { isCurrentSeason: false })

    // Establecer la temporada deseada como la actual
    const updatedSeason = await Season.findByIdAndUpdate(
      seasonId,
      { isCurrentSeason: true },
      { new: true }
    )

    res.json(updatedSeason)
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ mensaje: 'Error al marcar la temporada como actual' })
  }
}

// // Controlador para eliminar una temporada por su ID
// const deleteSeasonById = async (req, res) => {
//   try {
//     const season = await Season.findById(req.params.id)
//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }
//     await season.remove()
//     res.json({ message: 'Season deleted' })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }
const deleteSeasonById = async (req, res) => {
  try {
    const result = await Season.deleteOne({ _id: req.params.id })
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Season not found' })
    }
    res.json({ message: 'Season deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para obtener todas las temporadas de una liga por su ID de liga y ademas, TEMPORADA ACTUAL
const getSeasonsByLeagueId = async (req, res) => {
  try {
    const { leagueId } = req.params
    const seasons = await Season.find({ league: leagueId })
    const currentSeason = await Season.findOne({
      league: leagueId,
      isCurrentSeason: true
    })

    res.json({ seasons, currentSeason })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para agregar múltiples partidos a una temporada por su ID
// const addMatchesToSeason = async (req, res) => {
//   try {
//     // Obtener el ID de la temporada desde los parámetros de la ruta
//     const seasonId = req.params.id

//     // Obtener la lista de partidos desde el cuerpo de la solicitud
//     const matches = req.body.matches
//     console.log('HOLA', matches)
//     // Buscar la temporada por su ID
//     const season = await Season.findById(seasonId)
//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }

//     // Obtener los IDs de los equipos de la temporada
//     const teamsSeason = season.teams.map((team) => team.toString())

//     // Verificar si los equipos de los partidos recibidos están en la temporada
//     const teamsInMatches = matches.every((match) => {
//       return (
//         teamsSeason.includes(match.homeTeam.toString()) &&
//         teamsSeason.includes(match.awayTeam.toString())
//       )
//     })
//     if (!teamsInMatches) {
//       return res.status(400).json({ message: 'Some teams in matches are not in the season' })
//     }

//     // Crear los partidos y asociarlos a la temporada
//     const createdMatches = await Match.create(matches)

//     // Agregar los IDs de los partidos a la temporada
//     season.matches.push(...createdMatches.map((match) => match._id))
//     await season.save()

//     // Iterar sobre los partidos y asociarlos a las "Fechas" (rondas)
//     for (const matchData of matches) {
//       // Crear el partido
//       const match = await Match.create(matchData)

//       // Obtener o crear la "Fecha" correspondiente (por número de ronda)
//       let fecha = await Fecha.findOne({ number: matchData.round, season: season._id })
//       if (!fecha) {
//         fecha = await Fecha.create({ number: matchData.round, season: season._id })
//       }

//       // Asociar el partido a la "Fecha"
//       fecha.matches.push(match._id)
//       await fecha.save()
//     }

//     // Devolver los partidos creados
//     res.status(201).json(createdMatches)
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

// ORIGINAL:
// const addMatchesToSeason = async (req, res) => {
//   try {
//     // Obtener el ID de la temporada desde los parámetros de la ruta
//     const seasonId = req.params.seasonId

//     // Obtener la lista de partidos desde el cuerpo de la solicitud
//     const matches = req.body.matches
//     console.log('DATA DEL MATCH', matches)
//     // Buscar la temporada por su ID
//     const season = await Season.findById(seasonId)
//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }

//     // Obtener los IDs de los equipos de la temporada
//     const teamsSeason = season.teams.map((team) => team.toString())

//     // Verificar si los equipos de los partidos recibidos están en la temporada
//     const teamsInMatches = matches.every((match) => {
//       return (
//         teamsSeason.includes(match.homeTeam.toString()) &&
//         teamsSeason.includes(match.awayTeam.toString())
//       )
//     })
//     if (!teamsInMatches) {
//       return res.status(400).json({ message: 'Some teams in matches are not in the season' })
//     }

//     // Iterar sobre los partidos y asociarlos a las "Fechas" (rondas)
//     for (const matchData of matches) {
//       // Crear el partido
//       const match = await Match.create(matchData)

//       // Obtener o crear la "Fecha" correspondiente (por número de ronda)
//       let fecha = await Fecha.findOne({ number: matchData.round, season: seasonId, order: matchData.order })
//       if (!fecha) {
//         fecha = await Fecha.create({ number: matchData.round, season: seasonId, order: matchData.order })
//         // Agregar la fecha a la temporada
//         season.fechas.push(fecha._id)
//       } else {
//         // Verificar si la fecha ya está en la lista de fechas de la temporada
//         const isFechaInSeason = season.fechas.some((f) => f.equals(fecha._id))
//         if (!isFechaInSeason) {
//           // Agregar la fecha a la temporada
//           season.fechas.push(fecha._id)
//         }
//       }

//       // Asociar el partido a la "Fecha"
//       fecha.matches.push(match._id)
//       await fecha.save()

//       // Agregar el partido a la lista de partidos de la temporada
//       season.matches.push(match._id)
//     }

//     // Guardar los cambios en la temporada
//     await season.save()

//     // Devolver los partidos creados
//     res.status(201).json(matches)
//   } catch (error) {
//     console.error(error.message)
//     res.status(500).json({ message: error.message })
//   }
// }

// const addMatchesToSeason = async (req, res) => {
//   try {
//     // Obtener el ID de la temporada desde los parámetros de la ruta
//     const seasonId = req.params.seasonId

//     // Obtener la lista de partidos desde el cuerpo de la solicitud
//     const matches = req.body.matches
//     console.log('DATA DEL MATCH', matches)

//     // Buscar la temporada por su ID
//     const season = await Season.findById(seasonId).populate('zones')
//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }

//     // Obtener los IDs de los equipos de la temporada
//     const teamsSeason = season.teams.map((team) => team.toString())

//     // Verificar si los equipos de los partidos recibidos están en la temporada
//     const teamsInMatches = matches.every((match) => {
//       return (
//         teamsSeason.includes(match.homeTeam.toString()) &&
//         teamsSeason.includes(match.awayTeam.toString())
//       )
//     })
//     if (!teamsInMatches) {
//       return res
//         .status(400)
//         .json({ message: 'Some teams in matches are not in the season' })
//     }

//     // Iterar sobre los partidos y asociarlos a las "Fechas" (rondas)
//     // for (const matchData of matches) {
//     //   // Crear el partido
//     //   const match = await Match.create(matchData)

//     //   // Obtener o crear la "Fecha" correspondiente (por número de ronda)
//     //   let fecha = await Fecha.findOne({
//     //     number: matchData.round,
//     //     season: seasonId,
//     //     order: matchData.order
//     //   })
//     //   if (!fecha) {
//     //     fecha = await Fecha.create({
//     //       number: matchData.round,
//     //       season: seasonId,
//     //       order: matchData.order
//     //     })
//     //     // Agregar la fecha a la temporada
//     //     season.fechas.push(fecha._id)
//     //   } else {
//     //     // Verificar si la fecha ya está en la lista de fechas de la temporada
//     //     const isFechaInSeason = season.fechas.some((f) => f.equals(fecha._id))
//     //     if (!isFechaInSeason) {
//     //       // Agregar la fecha a la temporada
//     //       season.fechas.push(fecha._id)
//     //     }
//     //   }

//     //   // Asociar el partido a la "Fecha"
//     //   fecha.matches.push(match._id)
//     //   await fecha.save()

//     //   // Agregar el partido a la lista de partidos de la temporada
//     //   season.matches.push(match._id)

//     //   // Asociar el partido a la zona correspondiente si la temporada tiene zonas
//     //   if (season.zones && season.zones.length > 0) {
//     //     // Encuentra las zonas a las que pertenecen los equipos
//     //     for (const zone of season.zones) {
//     //       if (
//     //         zone.teams.includes(matchData.homeTeam) ||
//     //         zone.teams.includes(matchData.awayTeam)
//     //       ) {
//     //         zone.matches.push(match._id)
//     //         await zone.save()
//     //       }
//     //     }
//     //   }
//     // }

//     // Guardar los cambios en la temporada
//     await season.save()

//     // Devolver los partidos creados
//     res.status(201).json(matches)
//   } catch (error) {
//     console.error(error.message)
//     res.status(500).json({ message: error.message })
//   }
// }
// PRUEBA:
const addMatchesToSeason = async (req, res) => {
  try {
    // Obtener el ID de la temporada desde los parámetros de la ruta
    const seasonId = req.params.seasonId

    // Obtener la lista de partidos desde el cuerpo de la solicitud
    const matches = req.body.matches
    console.log('DATA DEL MATCH', matches)

    // Buscar la temporada por su ID
    const season = await Season.findById(seasonId).populate('zones')
    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    // Obtener los IDs de los equipos de la temporada
    const teamsSeason = season.teams.map((team) => team.toString())

    // Verificar si los equipos de los partidos recibidos están en la temporada
    const teamsInMatches = matches.every((match) => {
      return (
        teamsSeason.includes(match.homeTeam.toString()) &&
        teamsSeason.includes(match.awayTeam.toString())
      )
    })
    if (!teamsInMatches) {
      return res.status(400).json({ message: 'Some teams in matches are not in the season' })
    }

    // Iterar sobre los partidos y asociarlos a las "Fechas" (rondas)
    const populatedMatches = []
    for (const matchData of matches) {
      // Crear el partido
      const match = await Match.create(matchData)

      // Obtener o crear la "Fecha" correspondiente (por número de ronda)
      let fecha = await Fecha.findOne({
        number: matchData.round,
        season: seasonId,
        order: matchData.order
      })
      if (!fecha) {
        fecha = await Fecha.create({
          number: matchData.round,
          season: seasonId,
          order: matchData.order
        })
        // Agregar la fecha a la temporada
        season.fechas.push(fecha._id)
      } else {
        // Verificar si la fecha ya está en la lista de fechas de la temporada
        const isFechaInSeason = season.fechas.some((f) => f.equals(fecha._id))
        if (!isFechaInSeason) {
          // Agregar la fecha a la temporada
          season.fechas.push(fecha._id)
        }
      }

      // Asociar el partido a la "Fecha"
      fecha.matches.push(match._id)
      await fecha.save()

      // Agregar el partido a la lista de partidos de la temporada
      season.matches.push(match._id)

      // Asociar el partido a la zona correspondiente si la temporada tiene zonas
      if (season.zones && season.zones.length > 0) {
        // Encuentra las zonas a las que pertenecen los equipos
        for (const zone of season.zones) {
          if (
            zone.teams.includes(matchData.homeTeam) ||
            zone.teams.includes(matchData.awayTeam)
          ) {
            zone.matches.push(match._id)
            await zone.save()
          }
        }
      }

      // Poblar el partido con los nombres de los equipos, la liga y la temporada
      const populatedMatch = await Match.findById(match._id)
        .populate('homeTeam')
        .populate('awayTeam')
        .populate('league')
        .populate('seasonYear')

      populatedMatches.push(populatedMatch)
    }

    // Guardar los cambios en la temporada
    await season.save()

    // Devolver los partidos creados y populados
    res.status(201).json({ populatedMatches, state: 'ok' })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message })
  }
}

// Controlador para obtener una temporada particular por su ID y filtrar los partidos por su ronda (round)
const getSeasonMatchesByRound = async (req, res) => {
  try {
    const { id } = req.params
    const { round } = req.query
    console.log('RONDA', round)
    // Buscar la temporada por su ID
    const season = await Season.findById(id).populate({
      path: 'matches',
      populate: [{ path: 'homeTeam' }, { path: 'awayTeam' }]
    })

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    // Filtrar los partidos por su ronda si se proporciona el parámetro de consulta 'round'
    let filteredMatches = season.matches
    if (round) {
      filteredMatches = filteredMatches.filter(
        (match) => match.round === round
      )
    }

    res.json({
      season,
      matches: filteredMatches
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getTablePosition = async (req, res) => {
  try {
    const { seasonId } = req.params
    const positions = await calculatePositionTables(seasonId)
    console.log('POSITION', positions)
    res.json(positions)
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
}

// Controlador para obtener todas las temporadas que son la actual (isCurrentSeason = true)
const getAllCurrentSeasons = async (req, res) => {
  console.log('GOLA')
  try {
    const currentSeasons = await Season.find({ isCurrentSeason: true }).populate('league')
    res.json(currentSeasons)
  } catch (error) {
    console.log('error,', error)
    res.status(500).json({ message: error.message })
  }
}

// Ruta para obtener todos los equipos de una temporada específica
const getAllTeamsSeason = async (req, res) => {
  const { season } = req.params

  try {
    // Busca todos los equipos que pertenezcan a la temporada especificada
    const teams = await Team.find({ season }) // Ajusta según cómo esté estructurado tu modelo
    console.log('EQUIPOS', teams)
    if (!teams) {
      return res.status(404).json({ message: 'No se encontraron equipos para la temporada especificada' })
    }

    res.status(200).json(teams)
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    res.status(500).json({ message: 'Error del servidor al obtener equipos' })
  }
}

export const controllers = {
  createSeason,
  getAllSeasons,
  getSeasonById,
  updateSeasonById,
  deleteSeasonById,
  getSeasonsByLeagueId,
  addMatchesToSeason,
  getSeasonMatchesByRound,
  isCurrentSeason,
  getTablePosition,
  getAllCurrentSeasons,
  getAllTeamsSeason
}
