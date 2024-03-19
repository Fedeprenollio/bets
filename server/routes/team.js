import { Router } from 'express'
import { Team } from '../../schemas/team.js'

export const teamRouter = Router()

teamRouter.post('/', async (req, res) => {
  try {
    const team = new Team(req.body)
    await team.save()
    res.status(201).send(team)
  } catch (error) {
    res.status(400).send(error)
  }
})

// Ruta para obtener todos los equipos
teamRouter.get('/', async (req, res) => {
  try {
    const equipos = await Team.find()
    res.send(equipos)
  } catch (error) {
    res.status(500).send(error)
  }
})

// Ruta para obtener un equipo por su ID
teamRouter.get('/:id', async (req, res) => {
  const id = req.params.id
  try {
    const team = await Team.findById(id)
    if (!team) {
      return res.status(404).send()
    }
    res.send(team)
  } catch (error) {
    res.status(500).send(error)
  }
})
