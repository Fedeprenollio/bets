import express from 'express'
import { controllers } from '../controllers/season.controller.js'
import {
  addTeamToZone,
  addTeamsToZoneAndCreateZone,
  addZoneToSeason,
  deleteTeamFromZone,
  deleteZoneFromSeason,
  getTeamFromZone,
  getTeamsFromZone,
  getZoneFromSeason,
  getZonesFromSeason,
  updateTeamInZone,
  updateZoneInSeason
} from '../controllers/zone.controller.js'

// Crear un nuevo Router
export const seasonRouter = express.Router()

// // Ruta para obtener los equipos de una temporada
// seasonRouter.get('/:season/teams', controllers.getAllTeamsSeason)
// Ruta para crear una nueva temporada
seasonRouter.post('/', controllers.createSeason)

// Ruta para obtener todas las temporadas
seasonRouter.get('/', controllers.getAllSeasons)

seasonRouter.get('/currentSeasons', controllers.getAllCurrentSeasons)
// Ruta para obtener una temporada por su ID
seasonRouter.get('/:id', controllers.getSeasonById)

seasonRouter.put('/:id', controllers.updateSeasonById)

// Ruta para eliminar una temporada por su ID
seasonRouter.delete('/:id', controllers.deleteSeasonById)

// Ruta para obtener todas las temporadas actuales

// Ruta para obtener todas las temporadas de una liga por su ID de liga
seasonRouter.get('/league/:leagueId', controllers.getSeasonsByLeagueId)

// Ruta para agregar múltiples partidos a una temporada por su ID
seasonRouter.post('/:seasonId/matches', controllers.addMatchesToSeason)

// Ruta para agregar marcar la acutual temporada
seasonRouter.put('/:leagueId/:seasonId/isCurrent', controllers.isCurrentSeason)

// Ruta para obtener una temporada particular por su ID y filtrar los partidos por su ronda (round)
seasonRouter.get('/:id/matches', controllers.getSeasonMatchesByRound)
// // Ruta para crear una nueva temporada
// seasonRouter.post('/', async (req, res) => {
//   try {
//     const { leagueId, year, teams, matches, numberOfRounds } = req.body

//     console.log(leagueId, year)
//     // Obtener la liga a la que se asociará la temporada
//     const league = await League.findById(leagueId)

//     const season = new Season({ league: leagueId, year, teams, matches, numberOfRounds })
//     await season.save()

//     // Agregar la temporada a la lista de temporadas de la liga
//     league.season.push(season)
//     await league.save()
//     res.status(201).json({ status: 201, state: 'ok', season })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

// // Ruta para obtener todas las temporadas
// seasonRouter.get('/', async (req, res) => {
//   try {
//     const seasons = await Season.find().populate('league')
//     res.json(seasons)
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

// // Ruta para obtener una temporada por su ID
// seasonRouter.get('/:id', async (req, res) => {
//   const idSeason = req.params.id
//   try {
//     const season = await Season.findById(idSeason).populate('teams')
//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }
//     res.json(season)
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

// // // Ruta para actualizar una temporada por su ID
// // seasonRouter.put('/:id', async (req, res) => {
// //   try {
// //     const { year, teams, matches } = req.body
// //     const season = await Season.findById(req.params.id)
// //     if (!season) {
// //       return res.status(404).json({ message: 'Season not found' })
// //     }
// //     season.year = year
// //     season.teams = teams
// //     season.matches = matches
// //     await season.save()
// //     res.json(season)
// //   } catch (error) {
// //     res.status(500).json({ message: error.message })
// //   }
// // })

// seasonRouter.put('/:id', async (req, res) => {
//   console.log(req.body)
//   try {
//     const updates = req.body // Obtener las actualizaciones del cuerpo de la solicitud
//     const allowedUpdates = ['year', 'teams', 'matches'] // Definir los campos permitidos para actualizar

//     // Validar que las actualizaciones sean solo para campos permitidos
//     const isValidOperation = Object.keys(updates).every((update) =>
//       allowedUpdates.includes(update)
//     )
//     if (!isValidOperation) {
//       return res.status(400).send({ error: 'Invalid updates!' })
//     }

//     // Buscar la temporada por su ID y actualizar los campos
//     const season = await Season.findByIdAndUpdate(req.params.id, updates, {
//       new: true, // Devolver la temporada actualizada
//       runValidators: true // Ejecutar validaciones de mongoose
//     }).populate('teams')

//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }

//     res.json({ status: 201, state: 'ok', season })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

// // Ruta para eliminar una temporada por su ID
// seasonRouter.delete('/:id', async (req, res) => {
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
// })

// // Ruta para obtener todas las temporadas de una liga por su ID de liga
// seasonRouter.get('/league/:leagueId', async (req, res) => {
//   try {
//     const { leagueId } = req.params
//     const seasons = await Season.find({ league: leagueId })
//     res.json(seasons)
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

// // Ruta para agregar múltiples partidos a una temporada por su ID
// seasonRouter.post('/:id/matches', async (req, res) => {
//   try {
//     // Obtener el ID de la temporada desde los parámetros de la ruta
//     const seasonId = req.params.id
//     console.log(seasonId)
//     // Obtener la lista de partidos desde el cuerpo de la solicitud
//     const matches = req.body.matches

//     // Buscar la temporada por su ID
//     const season = await Season.findById(seasonId)
//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }
//     console.log('TEMPORADA: ', season)
//     // Obtener los IDs de los equipos de la temporada
//     const teamsSeason = season.teams.map((team) => team.toString())

//     console.log('Equipos en la temporada:', teamsSeason)
//     console.log('Equipos recibidos:', matches)

//     // Verificar si los equipos de los partidos recibidos están en la temporada
//     const teamsInMatches = matches.every((match) => {
//       console.log('DENTRO DEL EVERy', match)
//       return (
//         teamsSeason.includes(match.homeTeam.toString()) &&
//         teamsSeason.includes(match.awayTeam.toString())
//       )
//     })
//     console.log('EQUIPOS DEL PARTIDO', teamsInMatches)
//     if (!teamsInMatches) {
//       return res
//         .status(400)
//         .json({ message: 'Some teams in matches are not in the season' })
//     }

//     // Crear los partidos y asociarlos a la temporada
//     console.log('Partidos recibidos:', matches)
//     // const createdMatches = await Match.create(matches)
//     const createdMatches = await Match.create(matches)

//     console.log('PArtidos creado', createdMatches)
//     // Agregar los IDs de los partidos a la temporada
//     season.matches.push(...createdMatches.map((match) => match._id))
//     await season.save()

//     // Devolver los partidos creados
//     res.status(201).json(createdMatches)
//   } catch (error) {
//     console.log(error.message)
//     res.status(500).json({ message: error.message })
//   }
// })

// // Ruta para obtener una temporada particular por su ID y filtrar los partidos por su ronda (round)
// seasonRouter.get('/:id/matches', async (req, res) => {
//   try {
//     const { id } = req.params
//     const { round } = req.query
//     console.log('/////', id, round)

//     // Buscar la temporada por su ID
//     const season = await Season.findById(id).populate({
//       path: 'matches',
//       populate: [
//         { path: 'homeTeam' },
//         { path: 'awayTeam' }
//       ]
//     })

//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }

//     // Filtrar los partidos por su ronda si se proporciona el parámetro de consulta 'round'
//     let filteredMatches = season.matches
//     if (round) {
//       filteredMatches = filteredMatches.filter(match => match.round === parseInt(round))
//     }

//     res.json({
//       season,
//       matches: filteredMatches
//     })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

seasonRouter.get('/:seasonId/positions', controllers.getTablePosition)

seasonRouter.post('/:seasonId/zones', addZoneToSeason)
seasonRouter.get('/:seasonId/zones', getZonesFromSeason)
seasonRouter.get('/:seasonId/zones/:zoneId', getZoneFromSeason)
seasonRouter.put('/:seasonId/zones/:zoneId', updateZoneInSeason)
seasonRouter.delete('/:seasonId/zones/:zoneId', deleteZoneFromSeason)

seasonRouter.post('/zone/:zoneId/addTeams', addTeamToZone)
// CREA ZONA Y AGREGA LOS EQUIPOS:
seasonRouter.post('/add-teams', addTeamsToZoneAndCreateZone)

seasonRouter.get('/:seasonId/zones/:zoneId/teams', getTeamsFromZone)
seasonRouter.get('/:seasonId/zones/:zoneId/teams/:teamId', getTeamFromZone)
seasonRouter.put('/:seasonId/zones/:zoneId/teams/:teamId', updateTeamInZone)
seasonRouter.delete('/zone/:zoneId/team/:teamId', deleteTeamFromZone)
