import { Router } from 'express'
import { Team } from '../../schemas/team.js'
import { Match } from '../../schemas/match.js'

export const teamRouter = Router()

teamRouter.post('/', async (req, res) => {
  console.log(req.body)
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

// teamRouter.delete('/:id', async (req, res) => {
//   try {
//     const id = req.params.id
//     // Buscar el equipo por su ID y eliminarlo
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
teamRouter.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    // Verificar si el equipo tiene algún partido asociado
    const matchesCount = await Match.countDocuments({ $or: [{ homeTeam: id }, { awayTeam: id }] })
    if (matchesCount > 0) {
      return res.status(400).json({ message: 'No se puede eliminar el equipo porque tiene partidos asociados' })
    }
    // Si el equipo no tiene partidos asociados, proceder con la eliminación
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
