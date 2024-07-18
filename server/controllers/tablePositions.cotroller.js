import { Match } from '../../schemas/match.js'
import { Season } from '../../schemas/seasonSchema.js'
import { PositionTable } from '../../schemas/tablePositionsSchema.js'
import { calculatePositionTablesZone } from '../services/getTablePositionsZone.js'
import { calculatePositionTables } from '../services/tablePositions.js'
import { updateSeasonPositionTable, updateZonePositionTablesFromGeneral } from '../services/updatePositionTables.js'

const getTablePosition = async (req, res) => {
  try {
    const seasonId = req.params.id
    const positions = await calculatePositionTables(seasonId)
    res.json(positions)
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
}

const getPositionTableById = async (req, res) => {
  try {
    const positionTableId = req.params.positionTableId
    console.log('XXX')
    const positionTable = await PositionTable.find()

    if (!positionTable) {
      return res.status(404).json({ message: 'Position table not found' })
    }

    res.status(200).json(positionTable)
  } catch (error) {
    console.error('Error fetching position table:', error)
    res.status(500).send('An error occurred while fetching position table')
  }
}

const deletePositionTableById = async (req, res) => {
  try {
    // Buscar todas las tablas de posiciones
    const positionTables = await PositionTable.find()

    // Verificar si se encontraron tablas de posiciones
    if (positionTables.length === 0) {
      return res.status(404).json({ message: 'No position tables found' })
    }

    // Eliminar cada tabla de posiciones
    await Promise.all(positionTables.map(async (table) => {
      await PositionTable.findByIdAndDelete(table._id)
    }))

    return res.status(200).json({ message: 'All position tables deleted successfully' })
  } catch (error) {
    console.error('Error deleting all position tables:', error)
    res.status(500).send('An error occurred while deleting all position tables')
  }
}
const getAllTablesByZone = async (req, res) => {
  const { zoneId } = req.params // Se asume que el ID de la zona está en los parámetros de la solicitud

  try {
    const tables = await PositionTable.find({ zone: zoneId }) // Encuentra todas las tablas que pertenecen a la zona especificada
    res.json(tables) // Devuelve las tablas encontradas como respuesta JSON
  } catch (err) {
    console.error(err) // Maneja cualquier error
    res.status(500).json({ message: 'Ocurrió un error al obtener las tablas.' })
  }
}

/// //PROBANDO NUEVAS RUTAS
// const updatePositionTables = async (req, res) => {
//   try {
//     const { matchId } = req.body

//     const match = await Match.findById(matchId).populate('homeTeam awayTeam seasonYear')
//     if (!match) {
//       return res.status(404).json({ message: 'Match not found' })
//     }

//     const seasonId = match.seasonYear._id
//     const homeTeamId = match.homeTeam._id
//     const awayTeamId = match.awayTeam._id

//     const updatedSeasonTables = await updateSeasonPositionTable(seasonId)
//     const updatedZoneTables = await updateZonePositionTable(seasonId, homeTeamId, awayTeamId)

//     res.status(200).json({
//       message: 'Position tables updated successfully',
//       seasonTables: updatedSeasonTables,
//       zoneTables: updatedZoneTables
//     })
//   } catch (error) {
//     console.error('Error updating position tables:', error)
//     res.status(500).json({ message: 'An error occurred while updating position tables' })
//   }
// }

// const updateSeasonPositionTable = async (seasonId) => {
//   const season = await Season.findById(seasonId).populate('teams matches')
//   if (!season) {
//     throw new Error(`Season with ID ${seasonId} not found`)
//   }

//   const positionData = {
//     general: {},
//     home: {},
//     away: {}
//   }

//   for (const match of season.matches) {
//     if (!match.isFinished) continue

//     const homeTeamId = match.homeTeam.toString()
//     const awayTeamId = match.awayTeam.toString()

//     if (!positionData.general[homeTeamId]) {
//       positionData.general[homeTeamId] = initializeTeamData()
//       positionData.home[homeTeamId] = initializeTeamData()
//     }

//     if (!positionData.general[awayTeamId]) {
//       positionData.general[awayTeamId] = initializeTeamData()
//       positionData.away[awayTeamId] = initializeTeamData()
//     }

//     updateTeamData(positionData.general[homeTeamId], match.teamStatistics.local, match.teamStatistics.visitor)
//     updateTeamData(positionData.general[awayTeamId], match.teamStatistics.visitor, match.teamStatistics.local)
//     updateTeamData(positionData.home[homeTeamId], match.teamStatistics.local, match.teamStatistics.visitor)
//     updateTeamData(positionData.away[awayTeamId], match.teamStatistics.visitor, match.teamStatistics.local)
//   }

//   const generalTable = await saveOrUpdatePositionTable(seasonId, null, 'general', positionData.general)
//   const homeTable = await saveOrUpdatePositionTable(seasonId, null, 'home', positionData.home)
//   const awayTable = await saveOrUpdatePositionTable(seasonId, null, 'away', positionData.away)

//   return { general: generalTable, home: homeTable, away: awayTable }
// }

// const updateZonePositionTable = async (seasonId, homeTeamId, awayTeamId) => {
//   const season = await Season.findById(seasonId).populate('zones')
//   if (!season) {
//     throw new Error(`Season with ID ${seasonId} not found`)
//   }

//   const updatedZoneTables = []

//   for (const zone of season.zones) {
//     if (zone.teams.includes(homeTeamId) || zone.teams.includes(awayTeamId)) {
//       const zoneTables = await calculatePositionTablesZone(seasonId, zone._id)
//       updatedZoneTables.push({ zoneId: zone._id, ...zoneTables })
//     }
//   }

//   return updatedZoneTables
// }

// function initializeTeamData () {
//   return {
//     played: 0,
//     won: 0,
//     drawn: 0,
//     lost: 0,
//     goalsFor: 0,
//     goalsAgainst: 0,
//     goalDifference: 0,
//     points: 0,
//     puesto: 0 // Inicializa el campo 'puesto' también aquí
//   }
// }

// function updateTeamData (teamData, teamStats, opponentStats) {
//   if (!teamData) {
//     teamData = initializeTeamData()
//   }

//   teamData.played += 1
//   teamData.goalsFor += teamStats.goals
//   teamData.goalsAgainst += opponentStats.goals
//   teamData.goalDifference = teamData.goalsFor - teamData.goalsAgainst

//   if (teamStats.goals > opponentStats.goals) {
//     teamData.won += 1
//     teamData.points += 3
//   } else if (teamStats.goals === opponentStats.goals) {
//     teamData.drawn += 1
//     teamData.points += 1
//   } else {
//     teamData.lost += 1
//   }
// }

// async function saveOrUpdatePositionTable (seasonId, zoneId, type, positionData) {
//   const query = { season: seasonId, type }
//   if (zoneId) {
//     query.zone = zoneId
//   }

//   const existingTable = await PositionTable.findOne(query)

//   const positionsArray = Object.entries(positionData).map(([team, data]) => ({ team, ...data }))

//   positionsArray.sort((a, b) => {
//     if (b.points !== a.points) {
//       return b.points - a.points
//     }
//     if (b.goalDifference !== a.goalDifference) {
//       return b.goalDifference - a.goalDifference
//     }
//     if (b.goalsFor !== a.goalsFor) {
//       return b.goalsFor - a.goalsFor
//     }
//     return 0
//   })

//   positionsArray.forEach((teamData, index) => {
//     teamData.puesto = index + 1
//   })

//   if (existingTable) {
//     existingTable.positions = positionsArray
//     return await existingTable.save()
//   } else {
//     const positionTable = new PositionTable({
//       season: seasonId,
//       zone: zoneId,
//       type,
//       positions: positionsArray
//     })
//     return await positionTable.save()
//   }
// }

const updatePositionTables = async (req, res) => {
  console.log('Calculando POSCIONES')
  try {
    const { seasonId } = req.body

    const updatedGeneralTable = await updateSeasonPositionTable(seasonId)
    const updatedZoneTables = await updateZonePositionTablesFromGeneral(seasonId)

    res.status(200).json({
      message: 'Position tables updated successfully',
      generalTable: updatedGeneralTable,
      zoneTables: updatedZoneTables
    })
  } catch (error) {
    console.error('Error updating position tables:', error)
    res.status(500).json({ message: 'An error occurred while updating position tables' })
  }
}

export const tablePositionController = {
  getTablePosition,
  getPositionTableById,
  deletePositionTableById,
  getAllTablesByZone,
  updatePositionTables
}
