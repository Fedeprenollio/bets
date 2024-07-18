import { Match } from '../../schemas/match.js'

export const getMatchesAndStats = async ({
  contextId,
  contextType,
  matchesCount,
  query,
  statistic,
  lowerLimit,
  upperLimit,
  booleanLessThan
}) => {
  let matches = []
  if (contextType === 'season') {
    matches = await Match.find({ ...query, season: contextId })
      .sort({ date: -1 })
      .limit(parseInt(matchesCount))
      .populate({
        path: 'league',
        select: 'name'
      })
      .populate('homeTeam awayTeam')
      .populate('seasonYear', 'year')
  } else if (contextType === 'zone') {
    matches = await Match.find({ ...query, zone: contextId })
      .sort({ date: -1 })
      .limit(parseInt(matchesCount))
      .populate({
        path: 'league',
        select: 'name'
      })
      .populate('homeTeam awayTeam')
      .populate('seasonYear', 'year')
  }

  const generateStats = (matches, statistic, lowerLimit, upperLimit, isReceived = false) => {
    const stats = {
      matchesTotalFinished: matches?.length || 0,
      few: 0,
      many: 0,
      total: 0,
      values: []
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
      const teamStats = match.homeTeam.equals(contextId)
        ? isReceived ? match.teamStatistics.visitor : match.teamStatistics.local
        : isReceived ? match.teamStatistics.local : match.teamStatistics.visitor

      const statValue = teamStats[statistic]
      stats.total += statValue
      stats.values.push(statValue)

      ranges.forEach((range) => {
        const key = `matchesWith${range.toString().replace('.', '_')}`
        if (booleanLessThan) {
          if (statValue < range) {
            stats[key]++
          }
        } else {
          if (statValue >= range) {
            stats[key]++
          }
        }
      })

      if (booleanLessThan) {
        if (statValue < lowerLimit) {
          stats.few++
        }
      } else {
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

  const receivedStats = generateStats(
    matches,
    statistic,
    parseFloat(lowerLimit),
    parseFloat(upperLimit),
    true
  )

  return { matches, stats, receivedStats }
}
