import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../../middlewares/check-session-id-exists'
import moment from 'moment'

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date(),
      })

      const { name, description, isOnDiet, date } = createMealBodySchema.parse(
        request.body,
      )

      await knex('meals').insert({
        id: randomUUID(),
        user_id: request.user?.id,
        name,
        description,
        is_on_diet: isOnDiet,
        date: moment(date).format('YYYY-MM-DD HH:mm:ss'),
      })

      return response.status(201).send()
    },
  )
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const meals = await knex('meals')
        .select('*')
        .where('user_id', request.user?.id)
        .orderBy('date')
      return {
        meals,
      }
    },
  )
  app.get(
    '/:mealId',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const getMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meals')
        .where('user_id', request.user?.id)
        .where({ id: mealId })
        .first()
      if (!meal) {
        return response.status(404).send({ error: 'Meal ID not found' })
      }

      return { meal }
    },
  )
  app.put(
    '/:mealId',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const getMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getMealParamsSchema.parse(request.params)

      const updateMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date(),
      })

      const { name, description, isOnDiet, date } = updateMealBodySchema.parse(
        request.body,
      )

      const meal = await knex('meals')
        .where('user_id', request.user?.id)
        .where({ id: mealId })
        .first()

      if (!meal) {
        return response.status(404).send({ error: 'Meal ID not found' })
      }

      await knex('meals')
        .where({ id: mealId })
        .update({
          name,
          description,
          is_on_diet: isOnDiet,
          date: moment(date).format('YYYY-MM-DD HH:mm:ss'),
        })
      return response.status(204).send()
    },
  )

  app.delete(
    '/:mealId',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const getMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({ id: mealId }).first()

      if (!meal) {
        return response.status(404).send({ error: 'Meal ID not found' })
      }

      await knex('meals')
        .where('user_id', request.user?.id)
        .where({ id: mealId })
        .delete()

      return response.status(204).send()
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const summary = await knex('meals')
        .where('user_id', request.user?.id)
        .orderBy('date')
        .select([
          knex.raw('COUNT(*) as totalMeals'),
          knex.raw(
            'COUNT(CASE WHEN is_on_diet = true THEN 1 END) as totalMealsOnDiet',
          ),
          knex.raw(
            'COUNT(CASE WHEN is_on_diet = false THEN 1 END) as totalMealsOffDiet',
          ),
        ])
        .first()

      const meals = await knex('meals')
        .where('user_id', request.user?.id)
        .orderBy('date')
      let maxStreak = 0
      let currentStreak = 0

      for (const meal of meals) {
        if (meal.is_on_diet) {
          currentStreak++
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak
          }
        } else {
          currentStreak = 0
        }
      }
      return {
        summary: {
          ...summary,
          bestOnDietStreak: maxStreak,
        },
      }
    },
  )
}
