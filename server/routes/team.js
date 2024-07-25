import { Router } from 'express'
import { Team } from '../../schemas/team.js'
import { methods as authorization } from '../middleware/authentication.js'
import { verifyToken } from '../middleware/verifyToken .js'
import { Season } from '../../schemas/seasonSchema.js'
import { methods } from '../controllers/match.controller.js'

export const teamRouter = Router()

teamRouter.post('/', verifyToken, async (req, res) => {
  try {
    const team = await new Team(req.body)
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

// Nueva ruta para buscar equipos por nombre
teamRouter.get('/search/:name', async (req, res) => {
  const name = req.params.name
  try {
    const equipos = await Team.find({ name: { $regex: name, $options: 'i' } }).limit(10)
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

teamRouter.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    // Buscar el equipo por su ID y eliminarlo
    const deletedTeam = await Team.findByIdAndDelete(id)
    if (!deletedTeam) {
      return res.status(404).json({ message: 'No se encontró el equipo para eliminar' })
    }
    res.status(200).json({ message: 'Equipo eliminado exitosamente', deletedTeam })
  } catch (error) {
    console.error('Error al eliminar el equipo:', error)
    res.status(500).json({ message: 'Error al eliminar el equipo' })
  }
})
// teamRouter.delete('/:id', async (req, res) => {
//   try {
//     const id = req.params.id
//     // Verificar si el equipo tiene algún partido asociado
//     const matchesCount = await Match.countDocuments({ $or: [{ homeTeam: id }, { awayTeam: id }] })
//     if (matchesCount > 0) {
//       return res.status(400).json({ message: 'No se puede eliminar el equipo porque tiene partidos asociados' })
//     }
//     // Si el equipo no tiene partidos asociados, proceder con la eliminación
//     const deletedTeam = await Team.findByIdAndDelete(id)
//     if (!deletedTeam) {
//       return res.status(404).json({ message: 'No se encontró el equipo para eliminar' })
//     }
//     res.status(200).json({ message: 'Equipo eliminado exitosamente', deletedTeam })
//   } catch (error) {
//     console.error('Error al eliminar el equipo:', error)
//     res.status(500).json({ message: 'Error al eliminar el equipo' })
//   }
// })
// Ruta para obtener las ligas y temporadas de un equipo
teamRouter.get('/:id/leagues-seasons', async (req, res) => {
  const teamId = req.params.id
  try {
    const team = await Team.findById(teamId)
    if (!team) {
      return res.status(404).send({ message: 'Team not found' })
    }

    // Buscar temporadas donde el equipo ha jugado
    const seasons = await Season.find({ teams: teamId }).populate('league')

    if (!seasons.length) {
      return res.status(404).send({ message: 'No seasons found for this team' })
    }

    // Encontrar la temporada actual
    const currentSeason = seasons.find(season => season.isCurrentSeason)

    // Crear un mapa de ligas y sus respectivas temporadas
    const leaguesSeasons = seasons.reduce((acc, season) => {
      const leagueId = season.league._id
      if (!acc[leagueId]) {
        acc[leagueId] = {
          league: season.league,
          seasons: []
        }
      }
      acc[leagueId].seasons.push(season)
      return acc
    }, {})

    res.send({
      leaguesSeasons,
      currentSeason
    })
  } catch (error) {
    console.error('Error fetching leagues and seasons:', error)
    res.status(500).send({ message: 'An error occurred while fetching leagues and seasons' })
  }
})

teamRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, country, logo } = req.body

  try {
    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { name, country, logo },
      { new: true }
    )

    if (!updatedTeam) {
      return res.status(404).json({ message: 'Equipo no encontrado' })
    }

    res.status(200).json(updatedTeam)
  } catch (error) {
    console.error('Error al actualizar el equipo:', error)
    res.status(500).json({ message: 'Error al actualizar el equipo' })
  }
})

teamRouter.get('/stats/:teamId', methods.getTeamStatsNew)
