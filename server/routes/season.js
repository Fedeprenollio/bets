import express from 'express'
import { Season } from '../../schemas/seasonSchema.js'
import { League } from '../../schemas/leagueSchema.js'

// Crear un nuevo Router
export const seasonRouter = express.Router()

// Ruta para crear una nueva temporada
seasonRouter.post('/', async (req, res) => {
  try {
    const { leagueId, year, teams, matches } = req.body

    console.log(leagueId, year)
    // Obtener la liga a la que se asociará la temporada
    const league = await League.findById(leagueId)

    const season = new Season({ league: leagueId, year, teams, matches })
    await season.save()

    // Agregar la temporada a la lista de temporadas de la liga
    league.season.push(season)
    await league.save()
    res.status(201).json(season)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Ruta para obtener todas las temporadas
seasonRouter.get('/', async (req, res) => {
  try {
    const seasons = await Season.find().populate('league')
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

// // Ruta para actualizar una temporada por su ID
// seasonRouter.put('/:id', async (req, res) => {
//   try {
//     const { year, teams, matches } = req.body
//     const season = await Season.findById(req.params.id)
//     if (!season) {
//       return res.status(404).json({ message: 'Season not found' })
//     }
//     season.year = year
//     season.teams = teams
//     season.matches = matches
//     await season.save()
//     res.json(season)
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

seasonRouter.put('/:id', async (req, res) => {
  console.log(req.body)
  try {
    const updates = req.body // Obtener las actualizaciones del cuerpo de la solicitud
    const allowedUpdates = ['year', 'teams', 'matches'] // Definir los campos permitidos para actualizar

    // Validar que las actualizaciones sean solo para campos permitidos
    const isValidOperation = Object.keys(updates).every((update) =>
      allowedUpdates.includes(update)
    )
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates!' })
    }

    // Buscar la temporada por su ID y actualizar los campos
    const season = await Season.findByIdAndUpdate(req.params.id, updates, {
      new: true, // Devolver la temporada actualizada
      runValidators: true // Ejecutar validaciones de mongoose
    }).populate('teams')
    console.log(season)

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

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
