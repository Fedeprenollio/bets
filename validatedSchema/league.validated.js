import { z } from 'zod'

export const leagueSchema = z.object({
  name: z
    .string({ required_error: 'El nombre de liga es requerido' })
    .min(1, { message: 'El nombre de liga debe tener al menos 1 carácter' })
    .max(25, {
      message: 'El nombre de liga no puede tener más de 15 caracteres'
    }),
  country: z
    .string({ required_error: 'Un país es requerido' })
    .min(1, { message: 'El nombre del país debe tener al menos 1 carácter' })
    .max(15, {
      message: 'El nombre del país no puede tener más de 15 caracteres'
    })
})
