import { Season } from '../../schemas/seasonSchema.js'
import { Team } from '../../schemas/team.js'
import { Zone } from '../../schemas/zoneSchema.js'

export const addZoneToSeason = async (req, res) => {
  try {
    const { seasonId } = req.params
    const zoneData = req.body
    const season = await Season.findById(seasonId)

    console.log('seasonId', season)
    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    const newZone = new Zone(zoneData)
    season.zones.push(newZone)

    await season.save()

    res.status(201).json(newZone)
  } catch (error) {
    console.error('Error adding zone to season:', error)
    res.status(500).send('An error occurred while adding the zone to the season')
  }
}

export const getZonesFromSeason = async (req, res) => {
  try {
    const { seasonId } = req.params

    const season = await Season.findById(seasonId).populate({
      path: 'zones',

      populate: { path: 'teams' } // Puebla los equipos dentro de la zona
    })

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    res.status(200).json(season.zones)
  } catch (error) {
    console.error('Error fetching zones from season:', error)
    res.status(500).send('An error occurred while fetching the zones from the season')
  }
}

export const getZoneFromSeason = async (req, res) => {
  try {
    const { seasonId, zoneId } = req.params

    const season = await Season.findById(seasonId).populate('zones')

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    const zone = season.zones.id(zoneId)

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    res.status(200).json(zone)
  } catch (error) {
    console.error('Error fetching zone from season:', error)
    res.status(500).send('An error occurred while fetching the zone from the season')
  }
}

export const updateZoneInSeason = async (req, res) => {
  try {
    const { seasonId, zoneId } = req.params
    const zoneData = req.body

    const season = await Season.findById(seasonId).populate('zones')

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    const zone = season.zones.id(zoneId)

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    zone.set(zoneData)
    await season.save()

    res.status(200).json(zone)
  } catch (error) {
    console.error('Error updating zone in season:', error)
    res.status(500).send('An error occurred while updating the zone in the season')
  }
}

export const deleteZoneFromSeason = async (req, res) => {
  try {
    const { seasonId, zoneId } = req.params

    const season = await Season.findById(seasonId)

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    const zone = await Zone.findById(zoneId)

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    await zone.remove()
    await season.save()

    res.status(200).json({ message: 'Zone deleted successfully' })
  } catch (error) {
    console.error('Error deleting zone from season:', error)
    res.status(500).send('An error occurred while deleting the zone from the season')
  }
}

export const addTeamToZone = async (req, res) => {
  try {
    const { zoneId } = req.params
    const { teamIds } = req.body

    const zone = await Zone.findById(zoneId)

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    // Verificar que los equipos proporcionados existan en la base de datos
    const existingTeams = await Team.find({ _id: { $in: teamIds } })

    if (existingTeams.length !== teamIds.length) {
      return res.status(400).json({ message: 'One or more teams not found' })
    }

    // Agregar los IDs de los equipos a la zona
    zone.teams.push(...teamIds)

    await zone.save() // Guardar la zona con los nuevos equipos agregados

    res.status(201).json({ message: 'Teams added to zone successfully' })
  } catch (error) {
    console.error('Error adding teams to zone:', error)
    res.status(500).send('An error occurred while adding teams to the zone')
  }
}

export const getTeamsFromZone = async (req, res) => {
  try {
    const { seasonId, zoneId } = req.params

    const season = await Season.findById(seasonId).populate({
      path: 'zones',
      match: { _id: zoneId }, // Filtra la zona por su ID
      populate: { path: 'teams' } // Puebla los equipos dentro de la zona
    })

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    const zone = season.zones.id(zoneId)

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    res.status(200).json(zone.teams)
  } catch (error) {
    console.error('Error fetching teams from zone:', error)
    res.status(500).send('An error occurred while fetching the teams from the zone')
  }
}

export const getTeamFromZone = async (req, res) => {
  try {
    const { seasonId, zoneId, teamId } = req.params

    const season = await Season.findById(seasonId).populate({
      path: 'zones',
      populate: { path: 'teams' }
    })

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    const zone = season.zones.id(zoneId)

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    const team = zone.teams.id(teamId)

    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    res.status(200).json(team)
  } catch (error) {
    console.error('Error fetching team from zone:', error)
    res.status(500).send('An error occurred while fetching the team from the zone')
  }
}

export const updateTeamInZone = async (req, res) => {
  try {
    const { seasonId, zoneId, teamId } = req.params
    const teamData = req.body

    const season = await Season.findById(seasonId).populate({
      path: 'zones',
      populate: { path: 'teams' }
    })

    if (!season) {
      return res.status(404).json({ message: 'Season not found' })
    }

    const zone = season.zones.id(zoneId)

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    const team = zone.teams.id(teamId)

    if (!team) {
      return res.status(404).json({ message: 'Team not found' })
    }

    team.set(teamData)
    await season.save()

    res.status(200).json(team)
  } catch (error) {
    console.error('Error updating team in zone:', error)
    res.status(500).send('An error occurred while updating the team in the zone')
  }
}

export const deleteTeamFromZone = async (req, res) => {
  try {
    const { zoneId, teamId } = req.params

    const zone = await Zone.findByIdAndUpdate(
      zoneId,
      { $pull: { teams: teamId } }, // Remover el equipo por su ID
      { new: true } // Devolver la zona actualizada
    )

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' })
    }

    res.status(200).json({ message: 'Team deleted successfully' })
  } catch (error) {
    console.error('Error deleting team from zone:', error)
    res.status(500).send('An error occurred while deleting the team from the zone')
  }
}

export const addTeamsToZoneAndCreateZone = async (req, res) => {
  const { season, zones, league } = req.body

  if (!season || !zones || !Array.isArray(zones) || !league) {
    return res.status(400).json({ message: 'ID de la temporada, liga y las zonas son requeridos' })
  }

  try {
    // Busca la temporada por ID
    const seasonDoc = await Season.findById(season)
    if (!seasonDoc) {
      return res.status(404).json({ message: 'Temporada no encontrada' })
    }

    for (const zoneData of zones) {
      const { name, teams } = zoneData
      if (!name || !teams || !Array.isArray(teams)) {
        return res.status(400).json({ message: 'El nombre de la zona y los equipos son requeridos' })
      }

      let zone = await Zone.findOne({ zoneName: name, season })

      if (!zone) {
        // Si la zona no existe, crea una nueva
        zone = new Zone({
          zoneName: name,
          year: seasonDoc.year,
          league,
          teams,
          season
        })
        seasonDoc.zones.push(zone._id) // Añade la nueva zona a la temporada
      } else {
        // Agrega los equipos, evitando duplicados
        zone.teams = Array.from(new Set([...zone.teams, ...teams]))
      }

      // Guarda la zona en la base de datos
      await zone.save()
    }

    // Guarda los cambios en la temporada si se ha añadido alguna nueva zona
    await seasonDoc.save()

    res.status(200).json({ message: 'Equipos agregados a las zonas correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al agregar equipos a las zonas' })
  }
}
