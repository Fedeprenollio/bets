import { Season } from '../../schemas/seasonSchema.js'
import { PositionTable } from '../../schemas/tablePositionsSchema.js'
import { Zone } from '../../schemas/zoneSchema.js'

// Inicializa los datos del equipo
function initializeTeamData () {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    puesto: 0
  }
}

// Actualiza los datos del equipo con las estadísticas del partido
function updateTeamData (teamData, teamStats, opponentStats) {
  if (!teamData) {
    teamData = initializeTeamData()
  }

  teamData.played += 1
  teamData.goalsFor += teamStats.goals
  teamData.goalsAgainst += opponentStats.goals
  teamData.goalDifference = teamData.goalsFor - teamData.goalsAgainst

  if (teamStats.goals > opponentStats.goals) {
    teamData.won += 1
    teamData.points += 3
  } else if (teamStats.goals === opponentStats.goals) {
    teamData.drawn += 1
    teamData.points += 1
  } else {
    teamData.lost += 1
  }
}

// Guardar o actualizar la tabla de posiciones
async function saveOrUpdatePositionTable (seasonId, type, positionData) {
  const query = { season: seasonId, type }

  const existingTable = await PositionTable.findOne(query)

  const positionsArray = Object.entries(positionData).map(([team, data]) => ({ team, ...data }))

  positionsArray.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points
    }
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference
    }
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor
    }
    return 0
  })

  positionsArray.forEach((teamData, index) => {
    teamData.puesto = index + 1
  })

  if (existingTable) {
    existingTable.positions = positionsArray
    return await existingTable.save()
  } else {
    const positionTable = new PositionTable({
      season: seasonId,
      type,
      positions: positionsArray
    })
    return await positionTable.save()
  }
}

// Actualiza la tabla de posiciones de la temporada
export const updateSeasonPositionTable = async (seasonId) => {
  const season = await Season.findById(seasonId).populate('matches')
  if (!season) {
    throw new Error(`Season with ID ${seasonId} not found`)
  }

  const positionData = {}

  for (const match of season.matches) {
    if (!match.isFinished) continue

    const homeTeamId = match.homeTeam.toString()
    const awayTeamId = match.awayTeam.toString()

    if (!positionData[homeTeamId]) {
      positionData[homeTeamId] = initializeTeamData()
    }

    if (!positionData[awayTeamId]) {
      positionData[awayTeamId] = initializeTeamData()
    }

    updateTeamData(positionData[homeTeamId], match.teamStatistics.local, match.teamStatistics.visitor)
    updateTeamData(positionData[awayTeamId], match.teamStatistics.visitor, match.teamStatistics.local)
  }

  return await saveOrUpdatePositionTable(seasonId, 'general', positionData)
}

// Actualiza la tabla de posiciones de las zonas a partir de la tabla general
export const updateZonePositionTablesFromGeneral = async (seasonId) => {
  console.log('seasonId2', seasonId)
  const season = await Season.findById(seasonId).populate('zones')
  if (!season) {
    throw new Error(`Season with ID ${seasonId} not found`)
  }

  const generalTable = await PositionTable.findOne({ season: seasonId }).populate('positions.team')
  if (!generalTable) {
    throw new Error(`General position table for season ${seasonId} not found`)
  }

  const zoneTables = []

  for (const zone of season.zones) {
    const zoneTeams = zone.teams.map(teamId => teamId.toString())
    const zonePositions = generalTable.positions.filter(pos => zoneTeams.includes(pos.team._id.toString()))
    zonePositions.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points
      }
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference
      }
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor
      }
      return 0
    })

    zonePositions.forEach((teamData, index) => {
      teamData.puesto = index + 1
    })

    let zoneTable = await PositionTable.findOne({ season: seasonId, zone: zone._id, type: 'general' })

    if (zoneTable) {
      zoneTable.positions = zonePositions
      await zoneTable.save()
    } else {
      zoneTable = new PositionTable({
        season: seasonId,
        zone: zone._id,
        type: 'general',
        positions: zonePositions
      })
      await zoneTable.save()
    }

    await Zone.findByIdAndUpdate(zone._id, {
      positionTables: {
        general: zoneTable._id
      }
    })

    zoneTables.push(zoneTable)
  }

  return zoneTables
}
