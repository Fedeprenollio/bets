import * as z from 'zod'

export const TeamStatisticsSchema = z.object({
  goals: z.number(),
  offsides: z.number(),
  yellowCards: z.number(),
  redCards: z.number(),
  corners: z.number()
})

export const MatchSchema = z.object({
  homeTeam: z.string(), // Puedes ajustar el tipo según el tipo de identificador que uses en MongoDB
  awayTeam: z.string(), // Puedes ajustar el tipo según el tipo de identificador que uses en MongoDB
  result: z.string().optional(),
  date: z.date().optional(),
  teamStatistics: z.object({
    local: TeamStatisticsSchema,
    visitor: TeamStatisticsSchema
  }),
  isFinished: z.boolean().optional(),
  league: z.string(), // Puedes ajustar el tipo según el tipo de identificador que uses en MongoDB
  country: z.string().optional(),
  seasonYear: z.string(), // Puedes ajustar el tipo según el tipo de identificador que uses en MongoDB
  round: z.number().optional()
})
