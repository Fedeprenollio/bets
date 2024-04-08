import { Router } from 'express'
import { Team } from '../../schemas/team.js'
import { League } from '../../schemas/leagueSchema.js'
export const leagueRouter = Router()

// Obtener todas las ligas
leagueRouter.get('/', async (req, res) => {
  try {
    const leagues = await League.find().populate({
      path: 'season',
      populate: {
        path: 'teams',
        select: 'name' // Selecciona solo el nombre de los equipos
      }
    })
    res.json(leagues)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Crear una nueva liga
leagueRouter.post('/', async (req, res) => {
  try {
    const league = new League({
      name: req.body.name,
      country: req.body.country
      // season: req.body.season
    })

    // Guardar la liga
    const newLeague = await league.save()

    // // Si se proporciona un array de clubes en el cuerpo de la solicitud
    // if (Array.isArray(req.body.clubs) && req.body.clubs.length > 0) {
    //   // Asignar los IDs de los clubes proporcionados a la liga
    //   newLeague.clubs = req.body.clubs

    //   // Poblar la información completa de los clubes
    //   await newLeague.populate('clubs')

    //   // Guardar la liga actualizada con los clubes asociados
    // }
    await newLeague.save()

    res.status(201).json(newLeague)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Actualizar una liga
leagueRouter.patch('/:id', async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
    if (req.body.name != null) {
      league.name = req.body.name
    }
    if (req.body.country != null) {
      league.country = req.body.country
    }
    if (req.body.season != null) {
      league.season = req.body.season
    }
    const updatedLeague = await league.save()
    res.json(updatedLeague)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Eliminar una liga
leagueRouter.delete('/:id', async (req, res) => {
  try {
    await League.findByIdAndRemove(req.params.id)
    res.json({ message: 'Liga eliminada' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Agregar un equipo a una liga
leagueRouter.post('/:id/teams', async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
    if (!league) {
      return res.status(404).json({ message: 'Liga no encontrada' })
    }

    const team = await Team.findById(req.body.teamId)
    if (!team) {
      return res.status(404).json({ message: 'Club no encontrado' })
    }

    league.teams.push(team)
    await league.save()
    res.status(201).json(league)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})
