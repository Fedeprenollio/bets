// Importar los modelos necesarios
import { Season } from '../../schemas/seasonSchema.js'
import { League } from '../../schemas/leagueSchema.js'
import { Match } from '../../schemas/match.js'

// Controlador para crear una nueva temporada
const createSeason = async (req, res) => {
  try {
    const { leagueId, year, teams, matches, numberOfRounds } = req.body

    // Obtener la liga a la que se asociará la temporada
    const league = await League.findById(leagueId)

    const season = new Season({ league: leagueId, year, teams, matches, numberOfRounds })
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
    const seasons = await Season.find().populate('league')
    res.json(seasons)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para obtener una temporada por su ID
const getSeasonById = async (req, res) => {
  const idSeason = req.params.id
  try {
    const season = await Season.findById(idSeason).populate('teams')
    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }
    res.json(season)
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

// Controlador para eliminar una temporada por su ID
const deleteSeasonById = async (req, res) => {
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
}

// Controlador para obtener todas las temporadas de una liga por su ID de liga
const getSeasonsByLeagueId = async (req, res) => {
  try {
    const { leagueId } = req.params
    const seasons = await Season.find({ league: leagueId })
    res.json(seasons)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para agregar múltiples partidos a una temporada por su ID
const addMatchesToSeason = async (req, res) => {
  try {
    // Obtener el ID de la temporada desde los parámetros de la ruta
    const seasonId = req.params.id

    // Obtener la lista de partidos desde el cuerpo de la solicitud
    const matches = req.body.matches

    // Buscar la temporada por su ID
    const season = await Season.findById(seasonId)
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

    // Crear los partidos y asociarlos a la temporada
    const createdMatches = await Match.create(matches)

    // Agregar los IDs de los partidos a la temporada
    season.matches.push(...createdMatches.map((match) => match._id))
    await season.save()

    // Devolver los partidos creados
    res.status(201).json(createdMatches)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Controlador para obtener una temporada particular por su ID y filtrar los partidos por su ronda (round)
const getSeasonMatchesByRound = async (req, res) => {
  try {
    const { id } = req.params
    const { round } = req.query

    // Buscar la temporada por su ID
    const season = await Season.findById(id).populate({
      path: 'matches',
      populate: [
        { path: 'homeTeam' },
        { path: 'awayTeam' }
      ]
    })

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    // Filtrar los partidos por su ronda si se proporciona el parámetro de consulta 'round'
    let filteredMatches = season.matches
    if (round) {
      filteredMatches = filteredMatches.filter(match => match.round === parseInt(round))
    }

    res.json({
      season,
      matches: filteredMatches
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
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
  getSeasonMatchesByRound

}
