
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import express from 'express'
import pg from 'pg'

const { Pool } = pg

const weekdays = new Set([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
])

const port = Number(process.env.PORT || process.env.API_PORT || 3000)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const schemaPath = new URL('./schema.sql', import.meta.url)
const frontendDistPath = fileURLToPath(new URL('../dist/', import.meta.url))

function sendJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

function getRosterRows(rows) {
  return rows.map((row) => ({
    id: row.teammate_id,
    rosterOrder: row.roster_order,
    completed: Number(row.completed_orders),
    pending: Number(row.pending_orders),
    name: row.name,
    status: row.status,
    breakStartTime: row.break_start_time,
    returnTime: row.return_time,
  }))
}

async function readJson(request) {
  let body = ''

  for await (const chunk of request) {
    body += chunk
    if (body.length > 100_000) {
      throw Object.assign(new Error('Request body is too large.'), {
        status: 413,
      })
    }
  }

  try {
    return JSON.parse(body)
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), {
      status: 400,
    })
  }
}

function validateRoster(roster) {
  if (!Array.isArray(roster) || roster.length < 1 || roster.length > 100) {
    return 'A roster must contain between 1 and 100 teammates.'
  }

  const ids = new Set()

  for (const teammate of roster) {
    if (
      !teammate ||
      !Number.isSafeInteger(teammate.id) ||
      teammate.id < 1 ||
      ids.has(teammate.id)
    ) {
      return 'Each teammate must have a unique positive integer ID.'
    }

    ids.add(teammate.id)

    if (
      typeof teammate.name !== 'string' ||
      !teammate.name.trim() ||
      teammate.name.length > 100
    ) {
      return 'Teammate names must contain 1 to 100 characters.'
    }

    for (const key of ['completed', 'pending']) {
      if (
        teammate[key] !== undefined &&
        (!Number.isSafeInteger(teammate[key]) || teammate[key] < 0)
      ) {
        return 'Completed and pending counts must be non-negative integers.'
      }
    }

    if (teammate.status !== 'working' && teammate.status !== 'break') {
      return 'Teammate status must be working or break.'
    }

    for (const key of ['breakStartTime', 'returnTime']) {
      const value = teammate[key] ?? ''

      if (
        typeof value !== 'string' ||
        (value !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
      ) {
        return 'Break and return times must use 24-hour HH:MM format.'
      }
    }
  }

  return ''
}

async function handleRequest(request, response) {
  const url = new URL(request.url, 'http://localhost')

  // Temporary diagnostic endpoint. Remove it after debugging.
  if (url.pathname === '/api/db-check' && request.method === 'GET') {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        current_schema() AS schema,
        current_user AS username,
        to_regclass('public.weekday_teammates') AS teammates_table,
        to_regclass('public.weekday_rosters') AS rosters_table,
        to_regclass('public.weekday_order_progress') AS progress_table
    `)

    return sendJson(response, 200, result.rows[0])
  }

  if (url.pathname === '/api/health' && request.method === 'GET') {
    await pool.query('SELECT 1')
    return sendJson(response, 200, { ok: true })
  }

  if (url.pathname === '/api/rosters' && request.method === 'GET') {
    const result = await pool.query(`
      SELECT weekday, teammate_id, roster_order, completed_orders,
             pending_orders, name, status, break_start_time, return_time
      FROM public.weekday_teammates
      ORDER BY weekday, roster_order, teammate_id
    `)

    const rosters = {}

    for (const row of result.rows) {
      rosters[row.weekday] ??= []
      rosters[row.weekday].push(...getRosterRows([row]))
    }

    const progressResult = await pool.query(`
      SELECT weekday, teammates, new_allocations, recent_batches, updated_at
      FROM public.weekday_order_progress
    `)

    const progress = Object.fromEntries(
      progressResult.rows.map((row) => [
        row.weekday,
        {
          teammates: row.teammates,
          allocations: row.new_allocations,
          recentBatches: row.recent_batches,
          updatedAt: new Date(row.updated_at).toISOString(),
        },
      ]),
    )

    return sendJson(response, 200, { rosters, progress })
  }

  const rosterMatch = url.pathname.match(/^\/api\/rosters\/([^/]+)$/)

  if (rosterMatch && request.method === 'PUT') {
    const weekday = decodeURIComponent(rosterMatch[1])

    if (!weekdays.has(weekday)) {
      return sendJson(response, 400, { error: 'Choose a valid weekday.' })
    }

    const body = await readJson(request)
    const validationError = validateRoster(body.roster)

    if (validationError) {
      return sendJson(response, 400, { error: validationError })
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO public.weekday_rosters (weekday)
         VALUES ($1)
         ON CONFLICT (weekday)
         DO UPDATE SET updated_at = now()`,
        [weekday],
      )

      await client.query(
        'DELETE FROM public.weekday_teammates WHERE weekday = $1',
        [weekday],
      )

      for (const [rosterOrder, teammate] of body.roster.entries()) {
        await client.query(
          `INSERT INTO public.weekday_teammates
            (weekday, teammate_id, roster_order, completed_orders,
             pending_orders, name, status, break_start_time, return_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            weekday,
            teammate.id,
            rosterOrder,
            teammate.completed ?? 0,
            teammate.pending ?? 0,
            teammate.name.trim(),
            teammate.status,
            teammate.breakStartTime ?? '',
            teammate.returnTime ?? '',
          ],
        )
      }

      await client.query('COMMIT')
      return sendJson(response, 200, {
        weekday,
        roster: body.roster,
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  const progressMatch = url.pathname.match(/^\/api\/progress\/([^/]+)$/)

  if (progressMatch) {
    const weekday = decodeURIComponent(progressMatch[1])

    if (!weekdays.has(weekday)) {
      return sendJson(response, 400, { error: 'Choose a valid weekday.' })
    }

    if (request.method === 'DELETE') {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(
          'DELETE FROM public.weekday_order_progress WHERE weekday = $1',
          [weekday],
        )
        await client.query(
          `UPDATE public.weekday_teammates
           SET completed_orders = 0, pending_orders = 0
           WHERE weekday = $1`,
          [weekday],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
      return sendJson(response, 200, { weekday, cleared: true })
    }

    if (request.method === 'PUT') {
      const body = await readJson(request)
      const progress = body?.progress

      if (
        !progress ||
        !Array.isArray(progress.teammates) ||
        progress.teammates.length > 100
      ) {
        return sendJson(response, 400, {
          error: 'Order progress must include teammate counts.',
        })
      }

      const teammateIds = new Set()

      for (const teammate of progress.teammates) {
        if (
          !teammate ||
          !Number.isSafeInteger(teammate.id) ||
          teammate.id < 1 ||
          teammateIds.has(teammate.id) ||
          !Number.isSafeInteger(teammate.completed) ||
          teammate.completed < 0 ||
          !Number.isSafeInteger(teammate.pending) ||
          teammate.pending < 0
        ) {
          return sendJson(response, 400, {
            error: 'Completed and pending counts must be non-negative integers.',
          })
        }

        teammateIds.add(teammate.id)
      }

      if (
        !Array.isArray(progress.recentBatches) ||
        progress.recentBatches.length > 10
      ) {
        return sendJson(response, 400, {
          error: 'Recent batch history can contain up to 10 batches.',
        })
      }

      if (
        progress.updatedAt !== undefined &&
        (typeof progress.updatedAt !== 'string' ||
          !Number.isFinite(Date.parse(progress.updatedAt)))
      ) {
        return sendJson(response, 400, {
          error: 'Progress update time must be a valid timestamp.',
        })
      }

      const allocations = progress.allocations

      if (
        allocations !== null &&
        (typeof allocations !== 'object' ||
          Array.isArray(allocations) ||
          Object.values(allocations).some(
            (count) => !Number.isSafeInteger(count) || count < 0,
          ))
      ) {
        return sendJson(response, 400, {
          error: 'New allocations must be non-negative integer counts.',
        })
      }

      for (const batch of progress.recentBatches) {
        if (
          !batch ||
          typeof batch.id !== 'string' ||
          typeof batch.completedAt !== 'string' ||
          !Number.isFinite(Date.parse(batch.completedAt)) ||
          !Number.isSafeInteger(batch.totalOrders) ||
          batch.totalOrders < 0 ||
          !Array.isArray(batch.allocations) ||
          batch.allocations.some(
            (allocation) =>
              !allocation ||
              typeof allocation.name !== 'string' ||
              !Number.isSafeInteger(allocation.count) ||
              allocation.count < 0,
          )
        ) {
          return sendJson(response, 400, {
            error: 'A recent batch has invalid data.',
          })
        }
      }

      const client = await pool.connect()
      let result
      try {
        await client.query('BEGIN')
        result = await client.query(
          `INSERT INTO public.weekday_order_progress
            (weekday, teammates, new_allocations, recent_batches, updated_at)
           VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb,
                   COALESCE($5::timestamptz, now()))
           ON CONFLICT (weekday) DO UPDATE SET
             teammates = EXCLUDED.teammates,
             new_allocations = EXCLUDED.new_allocations,
             recent_batches = EXCLUDED.recent_batches,
             updated_at = GREATEST(
               now(), COALESCE(EXCLUDED.updated_at, now())
             )
           RETURNING updated_at`,
          [
            weekday,
            JSON.stringify(progress.teammates),
            JSON.stringify(progress.allocations),
            JSON.stringify(progress.recentBatches),
            progress.updatedAt ?? null,
          ],
        )
        await client.query(
          `UPDATE public.weekday_teammates AS roster
           SET completed_orders = counts.completed,
               pending_orders = counts.pending
           FROM jsonb_to_recordset($2::jsonb) AS counts(
             id integer, completed bigint, pending bigint
           )
           WHERE roster.weekday = $1
             AND roster.teammate_id = counts.id`,
          [weekday, JSON.stringify(progress.teammates)],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

      return sendJson(response, 200, {
        weekday,
        progress: {
          ...progress,
          updatedAt: new Date(result.rows[0].updated_at).toISOString(),
        },
      })
    }
  }

  return sendJson(response, 404, { error: 'Not found.' })
}

async function start() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Set it in server/.env.')
  }

  const schema = await readFile(fileURLToPath(schemaPath), 'utf8')
  await pool.query(schema)

  // Confirm the connection and tables before accepting requests.
  const check = await pool.query(`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      to_regclass('public.weekday_teammates') AS teammates_table,
      to_regclass('public.weekday_rosters') AS rosters_table,
      to_regclass('public.weekday_order_progress') AS progress_table
  `)

  console.log('Database connection check:', check.rows[0])

  const app = express()

  app.use(express.static(frontendDistPath, { index: false }))

  app.use((request, response) => {
    if (!request.path.startsWith('/api/')) {
      response.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url)))
      return
    }

    handleRequest(request, response).catch((error) => {
      const status = error.status || 500

      if (status >= 500) {
        console.error('API request failed:', error.message)
      }

      sendJson(response, status, {
        error: status >= 500 ? 'Database request failed.' : error.message,
      })
    })
  })

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`EquiOrder listening on port ${port}`)
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => pool.end().finally(() => process.exit(0)))
    })
  }
}

start().catch((error) => {
  console.error('Failed to start EquiOrder:', error.message)
  process.exitCode = 1
})
