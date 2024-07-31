import { Match } from '../../schemas/match.js'
import { PositionTable } from '../../schemas/tablePositionsSchema.js'
import { Season } from '../../schemas/seasonSchema.js'

export async function calculatePositionTables (seasonId) {
  console.log('Peru')
  const matches = await Match.find({ seasonYear: seasonId, isFinished: true })

  const positionData = {
    general: {},
    home: {},
    away: {}
  }

  // Inicializar datos
  for (const match of matches) {
    const homeTeamId = match.homeTeam.toString()
    const awayTeamId = match.awayTeam.toString()

    if (!positionData.general[homeTeamId]) {
      positionData.general[homeTeamId] = initializeTeamData()
      positionData.home[homeTeamId] = initializeTeamData()
    }
    if (!positionData.general[awayTeamId]) {
      positionData.general[awayTeamId] = initializeTeamData()
      positionData.away[awayTeamId] = initializeTeamData()
    }

    // Actualizar datos generales
    updateTeamData(positionData.general[homeTeamId], match.teamStatistics.local, match.teamStatistics.visitor)
    updateTeamData(positionData.general[awayTeamId], match.teamStatistics.visitor, match.teamStatistics.local)

    // Actualizar datos de local
    updateTeamData(positionData.home[homeTeamId], match.teamStatistics.local, match.teamStatistics.visitor)

    // Actualizar datos de visitante
    updateTeamData(positionData.away[awayTeamId], match.teamStatistics.visitor, match.teamStatistics.local)
  }

  const generalTable = await savePositionTable(seasonId, 'general', positionData.general)
  const homeTable = await savePositionTable(seasonId, 'home', positionData.home)
  const awayTable = await savePositionTable(seasonId, 'away', positionData.away)

  await Season.findByIdAndUpdate(seasonId, {
    positionTables: {
      general: generalTable._id,
      home: homeTable._id,
      away: awayTable._id
    }
  })

  return { general: generalTable, home: homeTable, away: awayTable }
}

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
    puesto: 0 // Inicializa el campo 'puesto' también aquí
  }
}

function updateTeamData (teamData, teamStats, opponentStats) {
  console.log('ARGENINA')

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

async function savePositionTable (seasonId, type, positionData) {
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
    return 0 // Puedes añadir más criterios de desempate aquí si es necesario
  })

  positionsArray.forEach((teamData, index) => {
    teamData.puesto = index + 1
  })

  const positionTable = new PositionTable({
    season: seasonId,
    type,
    positions: positionsArray
  })

  return await positionTable.save()
}
