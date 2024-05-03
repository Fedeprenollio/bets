import { Match } from '../../schemas/match.js'
import { Team } from '../../schemas/team.js'

// Controlador para obtener todos los partidos con filtros opcionales
const getAllMatches = async (req, res) => {
  try {
    const query = {}
    console.log('FINALIZADO?', req.query.isFinished)

    if (req.query.isFinished) {
      if (req.query.isFinished !== 'all') {
        query.isFinished = req.query.isFinished === 'true'
      }
      // No incluir el campo isFinished en la consulta si req.query.isFinished es 'all'
    }

    if (req.query.league && req.query.league.toLowerCase() !== 'all') {
      const encodedLeague = decodeURIComponent(req.query.league)
      query.league = encodedLeague
    }

    if (req.query.country && req.query.country.toLowerCase() !== 'all') {
      const encodedCountry = decodeURIComponent(req.query.country)
      query.country = encodedCountry
    }

    if (req.query.seasonYear) {
      // Ahora es un id de la temporada
      const yearId = req.query.seasonYear
      query.seasonYear = yearId
    }

    if (req.query.round && req.query.round.toLowerCase() !== 'all') {
      query.round = req.query.round
    }

    // Agregar filtro por fecha si se proporciona
    if (req.query.date) {
      console.log('FECHA DE BUSQIEDA en query------', req.query.date)
      const selectedDate = new Date(req.query.date)
      const nextDay = new Date(selectedDate)
      nextDay.setDate(nextDay.getDate() + 1) // Añadir un día para obtener la fecha límite

      query.date = {
        $gte: selectedDate, // Fecha de inicio del día seleccionado
        $lt: nextDay // Fecha de fin del día siguiente
      }
      console.log('QUERY.DATE', query.date)
    }

    // Agregar filtro por ID de temporada si se proporciona
    if (req.query.seasonId) {
      const seasonId = req.query.seasonId
      query.seasonYear = seasonId
    }

    console.log('QUERY', query)
    const matches = await Match.find(query)
      .populate('homeTeam awayTeam')
      .populate('league')

    res.send(matches)
  } catch (error) {
    console.error('Error fetching matches:', error)
    res.status(500).send('An error occurred while fetching matches')
  }
}

// Controlador para crear un nuevo partido
const createMatch = async (req, res) => {
  try {
    const {
      homeTeamName,
      awayTeamName,
      date,
      league,
      seasonYear,
      round,
      country
    } = req.body

    // Buscar los IDs de los equipos en la base de datos
    const homeTeam = await Team.findOne({ name: homeTeamName })
    const awayTeam = await Team.findOne({ name: awayTeamName })

    if (!homeTeam || !awayTeam) {
      return res
        .status(400)
        .send('Uno o ambos equipos no existen en la base de datos')
    }

    // Crear un nuevo partido con los IDs encontrados y la fecha proporcionada
    const match = new Match({
      homeTeam: homeTeam._id,
      awayTeam: awayTeam._id,
      date,
      country,
      league,
      seasonYear,
      round
    })
    await match.save()

    // Obtener toda la información de los equipos y agregarla a la respuesta
    const populatedMatch = await match.populate('homeTeam awayTeam')

    // Actualizar la lista de partidos en la liga correspondiente
    const updatedLeague = await League.findByIdAndUpdate(
      league,
      { $push: { matches: match._id } },
      { new: true }
    )

    res.status(201).send(populatedMatch)
  } catch (error) {
    console.error('Error creating match:', error)
    res.status(500).send('An error occurred while creating the match')
  }
}

// Controlador para actualizar el resultado de un partido
const updateMatchResult = async (req, res) => {
  console.log('ESTADISTICA? ****')
  try {
    const { goalsHome, goalsAway, teamStatistics } = req.body
    const matchId = req.params.id
    const match = await Match.findById(matchId)
    if (!match) {
      return res.status(404).send('Partido no encontrado')
    }

    // Actualizar estadísticas del equipo local
    match.teamStatistics.local.goals = teamStatistics.local.goals
    match.teamStatistics.local.offsides = teamStatistics.local.offsides
    match.teamStatistics.local.yellowCards = teamStatistics.local.yellowCards
    match.teamStatistics.local.redCards = teamStatistics.local.redCards
    match.teamStatistics.local.corners = teamStatistics.local.corners

    // Actualizar estadísticas del equipo visitante
    match.teamStatistics.visitor.goals = teamStatistics.visitor.goals
    match.teamStatistics.visitor.offsides = teamStatistics.visitor.offsides
    match.teamStatistics.visitor.yellowCards =
      teamStatistics.visitor.yellowCards
    match.teamStatistics.visitor.redCards = teamStatistics.visitor.redCards
    match.teamStatistics.visitor.corners = teamStatistics.visitor.corners

    // Actualizar resultado del partido
    match.goalsHome = goalsHome
    match.goalsAway = goalsAway
    match.isFinished = true

    await match.save()
    res.status(200).send(match)
  } catch (error) {
    console.error('Error updating match result:', error)
    res.status(500).send('An error occurred while updating match result')
  }
}

// Controlador para obtener un partido por su ID
const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      'awayTeam homeTeam league'
    )
    if (!match) {
      return res.status(404).send({ message: 'Partido no encotrado' })
    }
    res.send(match)
  } catch (error) {
    console.error('Error fetching match by ID:', error)
    res.status(500).send('An error occurred while fetching match by ID')
  }
}

// Controlador para obtener todos los partidos de un equipo
const getMatchesByTeamId = async (req, res) => {
  try {
    const idTeam = req.params.idTeam

    // Buscar todos los partidos en los que el equipo participó como local
    const homeMatches = await Match.find({ homeTeam: idTeam })
      .populate({
        path: 'homeTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo local
      })
      .populate({
        path: 'awayTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo visitante
      })
      .populate('league seasonYear') // Populate para la información completa de la liga y la temporada
    console.log('NNNNN', homeMatches)
    // Buscar todos los partidos en los que el equipo participó como visitante
    const awayMatches = await Match.find({ awayTeam: idTeam })
      .populate({
        path: 'homeTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo local
      })
      .populate({
        path: 'awayTeam',
        populate: { path: 'league' } // Populate para la información completa de la liga del equipo visitante
      })
      .populate('league seasonYear') // Populate para la información completa de la liga y la temporada

    // Combinar los partidos como local y como visitante en una sola lista
    const allMatches = [...homeMatches, ...awayMatches]

    res.status(200).send(allMatches)
  } catch (error) {
    console.error('Error fetching matches by team ID:', error)
    res.status(500).send('An error occurred while fetching matches by team ID')
  }
}

// Controlador para obtener estadísticas de un equipo
const getTeamStats = async (req, res) => {
  try {
    const idTeam = req.params.idTeam
    const {
      statistic,
      matchesCount = 5,
      homeOnly = true,
      awayOnly = true,
      lowerLimit,
      upperLimit,
      lessThan = false // Nuevo query para buscar partidos con menos de cierta cantidad
    } = req.query
    console.log('ENTRA', homeOnly, awayOnly)
    const booleanHomeOnly = homeOnly === 'true'
    const booleanAwayOnly = awayOnly === 'true'
    const boolenaLessThan = lessThan === 'true'
    // let query = { isFinished: true }
    let query = {
      $and: [
        { isFinished: true }

      ]
    }

    if (booleanHomeOnly && !booleanAwayOnly) {
      console.log('ONLY LOCAL')
      // query = { ...query, 'homeTeam._id': idTeam }
      query.$and.push({ homeTeam: idTeam })
    } else if (booleanAwayOnly && !booleanHomeOnly) {
      console.log('ONLY VISITOR')
      // query = { ...query, 'awayTeam._id': idTeam }
      query.$and.push({ awayTeam: idTeam })
    } else if (booleanHomeOnly && booleanAwayOnly) {
      console.log('ONLY AMBOS')
      query = {
        $and: [
          { isFinished: true },
          {
            $or: [
              { homeTeam: idTeam },
              { awayTeam: idTeam }
            // {
            //   [`teamStatistics.local.${statistic}`]: { $gte: parseFloat(lowerLimit), $lte: parseFloat(upperLimit) }
            // },
            // {
            //   [`teamStatistics.visitor.${statistic}`]: { $gte: parseFloat(lowerLimit), $lte: parseFloat(upperLimit) }
            // }
            ]
          }
        ]
      }
      // query = {
      //   ...query,
      //   $or: [{ 'homeTeam._id': idTeam }, { 'awayTeam._id': idTeam }]
      // }
    } else {
      // Si no se especifican filtros de local y visitante, devolver estadísticas vacías
      const emptyStats = {
        matchesTotalFinished: 0,
        few: 0,
        many: 0,
        total: 0
      }

      const allStats = {
        teamId: idTeam,
        teamName: 'Nombre del Equipo', // Puedes establecer el nombre del equipo aquí
        matches: [], // No hay partidos para mostrar
        matchesCount: 0,
        homeOnly,
        awayOnly,
        [statistic]: emptyStats,
        lessThan
      }
      return res.status(200).json(allStats)
    }

    const matches = await Match.find(query)
      .sort({ date: -1 })
      .limit(parseInt(matchesCount))
      .populate('homeTeam awayTeam')

    console.log('PARTIDOS', matches)

    const team = await Team.findById(idTeam)

    const generateStats = (matches, statistic, lowerLimit, upperLimit) => {
      const stats = {
        matchesTotalFinished: matches?.length || 0,
        few: 0,
        many: 0,
        total: 0
      }

      const ranges = []
      for (let i = parseFloat(lowerLimit); i <= parseFloat(upperLimit); i++) {
        ranges.push(i)
      }

      ranges.forEach((range) => {
        const key = `matchesWith${range.toString().replace('.', '_')}`
        stats[key] = 0
      })

      matches.forEach((match) => {
        const teamStats = match.homeTeam.equals(idTeam)
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const statValue = teamStats[statistic]

        stats.total += statValue

        ranges.forEach((range) => {
          const key = `matchesWith${range.toString().replace('.', '_')}`
          if (boolenaLessThan) {
            // Si lessThan es true, contabiliza los partidos donde la estadística es menor que el rango
            if (statValue < range) {
              stats[key]++
            }
          } else {
            // Si lessThan es false, contabiliza los partidos donde la estadística es mayor o igual que el rango
            if (statValue > range) {
              stats[key]++
            }
          }
        })

        if (boolenaLessThan) {
          // Si lessThan es true, contabiliza los partidos donde la estadística es menor que el límite inferior
          if (statValue < lowerLimit) {
            stats.few++
          }
        } else {
          // Si lessThan es false, contabiliza los partidos donde la estadística es mayor o igual que el límite inferior
          if (statValue >= lowerLimit) {
            stats.few++
          }
        }
      })

      return stats
    }

    const stats = generateStats(
      matches,
      statistic,
      parseFloat(lowerLimit),
      parseFloat(upperLimit)
    )

    const allStats = {
      teamId: team._id,
      teamName: team.name,
      matches,
      matchesCount,
      homeOnly,
      awayOnly,
      [statistic]: stats,
      lessThan, // Agregar la propiedad lessThan al resultado
      matchesWithStatistic: matches.filter((match) => {
        const teamStats = match.homeTeam.equals(idTeam)
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const statValue = teamStats[statistic]
        if (boolenaLessThan) {
          return statValue < parseFloat(upperLimit)
        } else {
          return statValue >= parseFloat(lowerLimit)
        }
      }),
      matchesWithRange: matches.filter((match) => {
        const teamStats = match.homeTeam.equals(idTeam)
          ? match.teamStatistics.local
          : match.teamStatistics.visitor
        const statValue = teamStats[statistic]
        if (boolenaLessThan) {
          return (
            parseFloat(lowerLimit) < statValue &&
            statValue < parseFloat(upperLimit)
          )
        } else {
          return (
            parseFloat(lowerLimit) <= statValue &&
            statValue <= parseFloat(upperLimit)
          )
        }
      })
    }
    res.status(200).json(allStats)
  } catch (error) {
    console.error('Error fetching team stats:', error)
    res.status(500).send('An error occurred while fetching team stats')
  }
}

// Controlador para eliminar un partido por su ID
const deleteMatchById = async (req, res) => {
  try {
    const matchId = req.params.id

    // Buscar y eliminar el partido por su _id
    const deletedMatch = await Match.findByIdAndDelete(matchId)

    if (!deletedMatch) {
      return res.status(404).send('Partido no encontrado')
    }

    res.status(200).send('Partido eliminado correctamente')
  } catch (error) {
    console.error('Error deleting match by ID:', error)
    res.status(500).send('An error occurred while deleting match by ID')
  }
}

// Controlador para actualizar un partido por su ID
const updateMatchById = async (req, res) => {
  try {
    const matchId = req.params.id
    const {
      homeTeamName,
      awayTeamName,
      date,
      league,
      seasonYear,
      round,
      country,
      goalsHome,
      goalsAway,
      isFinished
    } = req.body

    // Primero, construyes el objeto de actualización con los campos que deseas modificar
    const updateFields = {
      homeTeam: homeTeamName,
      awayTeam: awayTeamName,
      date,
      league,
      seasonYear,
      round,
      country,
      goalsHome,
      goalsAway,
      isFinished
    }

    // Luego, utilizas findByIdAndUpdate para buscar y actualizar el partido por su ID
    // El tercer parámetro opcional configura la opción 'new' como true para devolver el documento actualizado
    const updatedMatch = await Match.findByIdAndUpdate(matchId, updateFields, {
      new: true
    })

    if (!updatedMatch) {
      return res.status(404).send('Partido no encontrado')
    }

    res.status(200).send(updatedMatch)
  } catch (error) {
    console.error('Error updating match by ID:', error)
    res.status(500).send('An error occurred while updating match by ID')
  }
}

export const methods = {
  getAllMatches,
  createMatch,
  updateMatchResult,
  getMatchById,
  getMatchesByTeamId,
  getTeamStats,
  deleteMatchById,
  updateMatchById
}