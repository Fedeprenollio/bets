import express from 'express'
import { Season } from '../../schemas/seasonSchema.js'

// Crear un nuevo Router
export const seasonRouter = express.Router()

// Ruta para crear una nueva temporada
seasonRouter.post('/', async (req, res) => {
  try {
    const { leagueId, year, teams, matches } = req.body
    const season = new Season({ league: leagueId, year, teams, matches })
    await season.save()
    res.status(201).json(season)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Ruta para obtener todas las temporadas
seasonRouter.get('/', async (req, res) => {
  try {
    const seasons = await Season.find()
    res.json(seasons)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Ruta para obtener una temporada por su ID
seasonRouter.get('/:id', async (req, res) => {
  try {
    const season = await Season.findById(req.params.id)
    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }
    res.json(season)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Ruta para actualizar una temporada por su ID
seasonRouter.put('/:id', async (req, res) => {
  try {
    const { year, teams, matches } = req.body
    const season = await Season.findById(req.params.id)
    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }
    season.year = year
    season.teams = teams
    season.matches = matches
    await season.save()
    res.json(season)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Ruta para eliminar una temporada por su ID
seasonRouter.delete('/:id', async (req, res) => {
  try {
    const season = await Season.findById(req.params.id)
    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }
    await season.remove()
    res.json({ message: 'Season deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Ruta para obtener todas las temporadas de una liga por su ID de liga
seasonRouter.get('/league/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params
    const seasons = await Season.find({ league: leagueId })
    res.json(seasons)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})
