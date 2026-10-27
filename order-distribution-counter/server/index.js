
import 'dotenv/config'
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import express from 'express'
import pg from 'pg'

const { Pool } = pg
const scrypt = promisify(scryptCallback)

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
const sessionDurationSeconds = 60 * 60 * 24
const quickCopySeedNotes = [
  'PJ KIM T. GARCIA',
  '135432',
  'AUDITED || FTD || COMPLETED BY',
  'AUDITED || BLM|| COMPLETED BY',
  'AUDITED || DOVEPLUS || COMPLETED BY',
  'COMPLETED VIA GOOGLE SHEET',
  'ORDER PREVIEW MODE',
]

function sendJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return scrypt(password, salt, 64).then((derivedKey) =>
    `scrypt$${salt}$${Buffer.from(derivedKey).toString('hex')}`,
  )
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, expectedHex] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false
  const actual = Buffer.from(await scrypt(password, salt, 64))
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie ?? ''
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return ''
}

function setSessionCookie(request, response, token) {
  const secure = request.secure || request.headers['x-forwarded-proto'] === 'https'
  response.setHeader('set-cookie', [
    `equiorder_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${sessionDurationSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; '))
}

function clearSessionCookie(request, response) {
  const secure = request.secure || request.headers['x-forwarded-proto'] === 'https'
  response.setHeader('set-cookie', [
    'equiorder_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; '))
}

async function readSessionUser(request) {
  const token = readCookie(request, 'equiorder_session')
  if (!token) return null
  const result = await pool.query(
    `SELECT users.id, users.email, users.display_name
     FROM public.sessions
     JOIN public.users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
    [hashSessionToken(token)],
  )
  return result.rows[0] ?? null
}

async function createSession(userId, request, response) {
  const token = randomBytes(32).toString('base64url')
  await pool.query(
    `INSERT INTO public.sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + ($3 * interval '1 second'))`,
    [hashSessionToken(token), userId, sessionDurationSeconds],
  )
  setSessionCookie(request, response, token)
}

function publicUser(user) {
  return { id: Number(user.id), email: user.email, name: user.display_name }
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

  if (url.pathname === '/api/health' && request.method === 'GET') {
    await pool.query('SELECT 1')
    return sendJson(response, 200, { ok: true })
  }

  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await readSessionUser(request)
    if (!user) return sendJson(response, 401, { error: 'Sign in to continue.' })
    return sendJson(response, 200, { user: publicUser(user) })
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await readJson(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) {
      return sendJson(response, 400, { error: 'Enter your email and password.' })
    }
    const result = await pool.query(
      'SELECT id, email, display_name, password_hash FROM public.users WHERE email = $1',
      [email],
    )
    const user = result.rows[0]
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return sendJson(response, 401, { error: 'Email or password is incorrect.' })
    }
    await createSession(user.id, request, response)
    return sendJson(response, 200, { user: publicUser(user) })
  }

  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const body = await readJson(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(response, 400, { error: 'Enter a valid email address.' })
    }
    if (password.length < 8 || password.length > 128) {
      return sendJson(response, 400, { error: 'Password must be 8 to 128 characters.' })
    }
    const displayName = email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'EquiOrder User'
    try {
      const result = await pool.query(
        `INSERT INTO public.users (email, display_name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name`,
        [email, displayName, await passwordHash(password)],
      )
      const user = result.rows[0]
      await createSession(user.id, request, response)
      return sendJson(response, 201, { user: publicUser(user) })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(response, 409, { error: 'An account with this email already exists.' })
      }
      throw error
    }
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = readCookie(request, 'equiorder_session')
    if (token) {
      await pool.query('DELETE FROM public.sessions WHERE token_hash = $1', [hashSessionToken(token)])
    }
    clearSessionCookie(request, response)
    return sendJson(response, 200, { ok: true })
  }

  const user = await readSessionUser(request)
  if (!user) return sendJson(response, 401, { error: 'Sign in to continue.' })
  const userId = user.id

  if (url.pathname === '/api/quick-notes' && request.method === 'GET') {
    const result = await pool.query(
      `SELECT id, note FROM public.quick_copy_notes
       WHERE user_id = $1 ORDER BY position, id`,
      [userId],
    )
    return sendJson(response, 200, { notes: result.rows })
  }

  if (url.pathname === '/api/quick-notes' && request.method === 'POST') {
    const body = await readJson(request)
    const note = typeof body.note === 'string' ? body.note.trim() : ''
    if (!note || note.length > 1000) {
      return sendJson(response, 400, { error: 'Text must contain 1 to 1000 characters.' })
    }
    const result = await pool.query(
      `INSERT INTO public.quick_copy_notes (user_id, note, position)
       VALUES ($1, $2, COALESCE((SELECT max(position) + 1 FROM public.quick_copy_notes WHERE user_id = $1), 0))
       RETURNING id, note`,
      [userId, note],
    )
    return sendJson(response, 201, { note: result.rows[0] })
  }

  const noteMatch = url.pathname.match(/^\/api\/quick-notes\/(\d+)$/)
  if (noteMatch && request.method === 'PUT') {
    const body = await readJson(request)
    const note = typeof body.note === 'string' ? body.note.trim() : ''
    if (!note || note.length > 1000) {
      return sendJson(response, 400, { error: 'Text must contain 1 to 1000 characters.' })
    }
    const result = await pool.query(
      `UPDATE public.quick_copy_notes SET note = $3
       WHERE user_id = $1 AND id = $2 RETURNING id, note`,
      [userId, Number(noteMatch[1]), note],
    )
    if (result.rowCount === 0) return sendJson(response, 404, { error: 'Note not found.' })
    return sendJson(response, 200, { note: result.rows[0] })
  }
  if (noteMatch && request.method === 'DELETE') {
    const result = await pool.query(
      'DELETE FROM public.quick_copy_notes WHERE user_id = $1 AND id = $2',
      [userId, Number(noteMatch[1])],
    )
    if (result.rowCount === 0) return sendJson(response, 404, { error: 'Note not found.' })
    return sendJson(response, 200, { deleted: true })
  }

  if (url.pathname === '/api/rosters' && request.method === 'GET') {
    const result = await pool.query(`
      SELECT weekday, teammate_id, roster_order, completed_orders,
             pending_orders, name, status, break_start_time, return_time
      FROM public.weekday_teammates
      WHERE user_id = $1
      ORDER BY weekday, roster_order, teammate_id
    `, [userId])

    const rosters = {}

    for (const row of result.rows) {
      rosters[row.weekday] ??= []
      rosters[row.weekday].push(...getRosterRows([row]))
    }

    const progressResult = await pool.query(`
      SELECT weekday, teammates, new_allocations, recent_batches, updated_at
      FROM public.weekday_order_progress
      WHERE user_id = $1
    `, [userId])

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
        `INSERT INTO public.weekday_rosters (user_id, weekday)
         VALUES ($1, $2)
         ON CONFLICT (user_id, weekday)
         DO UPDATE SET updated_at = now()`,
        [userId, weekday],
      )

      await client.query(
        'DELETE FROM public.weekday_teammates WHERE user_id = $1 AND weekday = $2',
        [userId, weekday],
      )

      for (const [rosterOrder, teammate] of body.roster.entries()) {
        await client.query(
          `INSERT INTO public.weekday_teammates
            (user_id, weekday, teammate_id, roster_order, completed_orders,
             pending_orders, name, status, break_start_time, return_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            userId,
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
          'DELETE FROM public.weekday_order_progress WHERE user_id = $1 AND weekday = $2',
          [userId, weekday],
        )
        await client.query(
          `UPDATE public.weekday_teammates
           SET completed_orders = 0, pending_orders = 0
           WHERE user_id = $1 AND weekday = $2`,
          [userId, weekday],
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
            (user_id, weekday, teammates, new_allocations, recent_batches, updated_at)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb,
                   COALESCE($6::timestamptz, now()))
           ON CONFLICT (user_id, weekday) DO UPDATE SET
             teammates = EXCLUDED.teammates,
             new_allocations = EXCLUDED.new_allocations,
             recent_batches = EXCLUDED.recent_batches,
             updated_at = GREATEST(
               now(), COALESCE(EXCLUDED.updated_at, now())
             )
           RETURNING updated_at`,
          [
            userId,
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
           FROM jsonb_to_recordset($3::jsonb) AS counts(
             id integer, completed bigint, pending bigint
           )
           WHERE roster.user_id = $1
             AND roster.weekday = $2
             AND roster.teammate_id = counts.id`,
          [userId, weekday, JSON.stringify(progress.teammates)],
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

async function initializeBootstrapAccount() {
  const email = process.env.INITIAL_ACCOUNT_EMAIL?.trim().toLowerCase()
  const password = process.env.INITIAL_ACCOUNT_PASSWORD
  if (!email || !password) {
    throw new Error('INITIAL_ACCOUNT_EMAIL and INITIAL_ACCOUNT_PASSWORD are required in server/.env.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    throw new Error('The initial account email or password is invalid.')
  }

  const existing = await pool.query(
    'SELECT id FROM public.users WHERE email = $1',
    [email],
  )
  if (existing.rowCount > 0) return { id: existing.rows[0].id, created: false }

  const name = process.env.INITIAL_ACCOUNT_NAME?.trim() || 'PJ Kim Garcia'
  const created = await pool.query(
    `INSERT INTO public.users (email, display_name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, name, await passwordHash(password)],
  )
  const account = created.rows[0]
    ? { id: created.rows[0].id, created: true }
    : { id: (await pool.query('SELECT id FROM public.users WHERE email = $1', [email])).rows[0].id, created: false }
  return account
}

async function migrateLegacyDataToAccount(userId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('ALTER TABLE public.weekday_rosters ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.users(id) ON DELETE CASCADE')
    await client.query('ALTER TABLE public.weekday_teammates ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.users(id) ON DELETE CASCADE')
    await client.query('ALTER TABLE public.weekday_order_progress ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.users(id) ON DELETE CASCADE')
    await client.query('ALTER TABLE public.weekday_teammates DROP CONSTRAINT IF EXISTS weekday_teammates_weekday_fkey')
    await client.query('ALTER TABLE public.weekday_teammates DROP CONSTRAINT IF EXISTS weekday_teammates_user_id_weekday_fkey')
    await client.query('ALTER TABLE public.weekday_teammates DROP CONSTRAINT IF EXISTS weekday_teammates_user_weekday_fkey')
    await client.query('UPDATE public.weekday_rosters SET user_id = $1 WHERE user_id IS NULL', [userId])
    await client.query('UPDATE public.weekday_teammates SET user_id = $1 WHERE user_id IS NULL', [userId])
    await client.query('UPDATE public.weekday_order_progress SET user_id = $1 WHERE user_id IS NULL', [userId])
    await client.query('ALTER TABLE public.weekday_rosters ALTER COLUMN user_id SET NOT NULL')
    await client.query('ALTER TABLE public.weekday_teammates ALTER COLUMN user_id SET NOT NULL')
    await client.query('ALTER TABLE public.weekday_order_progress ALTER COLUMN user_id SET NOT NULL')
    await client.query('ALTER TABLE public.weekday_teammates DROP CONSTRAINT IF EXISTS weekday_teammates_pkey')
    await client.query('ALTER TABLE public.weekday_rosters DROP CONSTRAINT IF EXISTS weekday_rosters_pkey')
    await client.query('ALTER TABLE public.weekday_order_progress DROP CONSTRAINT IF EXISTS weekday_order_progress_pkey')
    await client.query('ALTER TABLE public.weekday_rosters ADD CONSTRAINT weekday_rosters_pkey PRIMARY KEY (user_id, weekday)')
    await client.query('ALTER TABLE public.weekday_teammates ADD CONSTRAINT weekday_teammates_pkey PRIMARY KEY (user_id, weekday, teammate_id)')
    await client.query('ALTER TABLE public.weekday_order_progress ADD CONSTRAINT weekday_order_progress_pkey PRIMARY KEY (user_id, weekday)')
    await client.query(`ALTER TABLE public.weekday_teammates
      ADD CONSTRAINT weekday_teammates_user_weekday_fkey
      FOREIGN KEY (user_id, weekday)
      REFERENCES public.weekday_rosters(user_id, weekday) ON DELETE CASCADE`)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function start() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Set it in server/.env.')
  }

  const schema = await readFile(fileURLToPath(schemaPath), 'utf8')
  await pool.query(schema)
  const bootstrapAccount = await initializeBootstrapAccount()
  await migrateLegacyDataToAccount(bootstrapAccount.id)
  await pool.query(`
    UPDATE public.sessions
    SET expires_at = LEAST(expires_at, created_at + interval '1 day')
    WHERE expires_at > created_at + interval '1 day'
  `)

  if (bootstrapAccount.created) {
    await pool.query(
      `INSERT INTO public.quick_copy_notes (user_id, note, position)
       SELECT $1, seed.note, seed.position
       FROM unnest($2::text[]) WITH ORDINALITY AS seed(note, position)
       ON CONFLICT DO NOTHING`,
      [bootstrapAccount.id, quickCopySeedNotes],
    )
  }

  console.log('Database initialized with account-scoped data.')

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
