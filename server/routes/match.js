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

matchRouter.post('/:id/result', async (req, res) => {
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

    // Actualizar estadísticas del equipo visitante
    match.teamStatistics.visitor.goals = stats.visitor.goals
    match.teamStatistics.visitor.offsides = stats.visitor.offsides
    match.teamStatistics.visitor.yellowCards = stats.visitor.yellowCards
    match.teamStatistics.visitor.redCards = stats.visitor.redCards

    // Actualizar resultado del partido
    match.goalsHome = goalsHome
    match.goalsAway = goalsAway
    match.finished = true // Podrías agregar un campo para marcar si el partido ha finalizado

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
    const homeMatches = await Match.find({ homeTeam: idTeam }).populate('awayTeam')

    // Buscar todos los partidos en los que el equipo participó como visitante
    const awayMatches = await Match.find({ awayTeam: idTeam }).populate('homeTeam')

    // Combinar los partidos como local y como visitante en una sola lista
    const allMatches = [...homeMatches, ...awayMatches]

    res.status(200).send(allMatches)
  } catch (error) {
    console.error('Error al buscar los partidos del equipo:', error)
    res.status(500).send('Error al buscar los partidos del equipo')
  }
})
