import { League } from '../../schemas/leagueSchema.js'
import { Team } from '../../schemas/team.js'
import dotenv, { populate } from 'dotenv'
dotenv.config()

// Obtener todas las ligas
async function getAllLeagues (req, res) {
  try {
    const leagues = await League.find().populate({
      path: 'season',
      populate: [
        { path: 'teams', select: 'name' }, // Populate para los equipos
        {
          path: 'matches',
          select: 'awayTeam homeTeam',
          populate: [
            { path: 'awayTeam' }, // Populate para awayTeam
            { path: 'homeTeam' } // Populate para homeTeam
          ]
        }
      ]
    })
    res.json(leagues)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Crear una nueva liga
async function createLeague (req, res) {
  try {
    const { name, country, season } = req.body

    // const authorization = req.get('authorization')
    // let token = null
    // if (authorization && authorization.toLowerCase().startsWith('bearer')) {
    //   token = authorization.substring(7)
    // }
    // let decodedToken = {}
    // try {
    //   decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    // } catch (e) {
    //   console.log(e)
    //   res.status(401).send({ error: 'Token inválido o faltante. Logueate por favor' })
    //   return
    // }

    // if (!token || !decodedToken.user) {
    //   res.status(401).send({ error: 'Token faltnte o invalido, logueate por favor' })
    // }

    const league = new League({ name, country, season })

    // Guardar la liga
    const newLeague = await league.save()

    res.status(201).json({ status: 201, state: 'ok', newLeague })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Actualizar una liga
async function updateLeague (req, res) {
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
}

// Eliminar una liga
async function deleteLeague (req, res) {
  try {
    const deletedDocument = await League.findByIdAndDelete(req.params.id)
    res.json({ message: 'Liga eliminada', state: 'ok' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Agregar un equipo a una liga
async function addTeamToLeague (req, res) {
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
}

// Obtener una liga por su ID
async function getLeagueById (req, res) {
  try {
    const league = await League.findById(req.params.id).populate({
      path: 'season',
      populate: [
        { path: 'teams', select: 'name' }, // Populate para los equipos
        {
          path: 'matches',
          select: 'awayTeam homeTeam date seasonYear round',
          populate: [
            { path: 'awayTeam' }, // Populate para awayTeam
            { path: 'homeTeam' } // Populate para homeTeam
          ]
        }, {
          path: 'fechas',
          populate: [
            { path: 'season' },
            {
              path: 'matches',
              populate: [
                { path: 'awayTeam' }, // Populate para awayTeam
                { path: 'homeTeam' } // Populate para homeTeam
              ]
            }
          ]
        }
      ]
    })

    if (!league) {
      return res.status(404).json({ message: 'Liga no encontrada' })
    }

    res.json(league)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const leagueControllers = {
  getAllLeagues,
  createLeague,
  updateLeague,
  deleteLeague,
  addTeamToLeague,
  getLeagueById
}
