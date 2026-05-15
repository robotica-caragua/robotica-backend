import { z } from 'zod'

export const requiredString = (message: string) => z.string().trim().min(1, message)
