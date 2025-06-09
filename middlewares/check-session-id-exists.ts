import { FastifyReply, FastifyRequest } from 'fastify'
import { knex } from '../src/database'

export async function checkSessionIdExists(
  request: FastifyRequest,
  response: FastifyReply,
) {
  const sessionId = request.cookies.sessionId

  if (!sessionId) {
    return response.status(401).send({ error: 'Unauthorized' })
  }

  const user = await knex('users').where({ session_id: sessionId }).first()

  if (!user) {
    return response.status(401).send({ error: 'Unauthorized' })
  }

  request.user = user
}
