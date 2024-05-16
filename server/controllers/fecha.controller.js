import { Fecha } from '../../schemas/fechaSchema.js'

const getDatesBySeason = async (req, res) => {
  try {
    // Obtener el ID de la temporada desde los parámetros de la ruta
    const seasonId = req.params.seasonId

    // Buscar las fechas por el ID de la temporada y poblar la información relacionada
    const dates = await Fecha.find({ season: seasonId })
      .populate({
        path: 'season',
        populate: [
          { path: 'teams', select: 'name' } // Populate para los equipos
        ]
      })
      .populate({
        path: 'matches',
        populate: [
          { path: 'homeTeam' }, // Populate para homeTeam
          { path: 'awayTeam' } // Populate para awayTeam
        ]
      }) // Populate para los partidos

    if (!dates || dates.length === 0) {
      return res.status(404).json({ message: 'No dates found for the season' })
    }

    res.status(200).json(dates)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
const setFechaAsCurrent = async (req, res) => {
  try {
    // Obtener el ID de la fecha desde los parámetros de la ruta
    const fechaId = req.params.fechaId

    // Buscar la fecha por su ID
    const fecha = await Fecha.findById(fechaId)
    if (!fecha) {
      return res.status(404).json({ message: 'Fecha not found' })
    }

    // Desmarcar cualquier otra fecha como la fecha actual si ya existe
    await Fecha.updateMany({}, { isCurrentFecha: false })

    // Marcar la fecha actual
    fecha.isCurrentFecha = true
    await fecha.save()

    res.status(200).json({ fecha, message: 'Fecha set as current successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const fechaController = {
  getDatesBySeason,
  setFechaAsCurrent

}
