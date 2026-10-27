CREATE TABLE IF NOT EXISTS public.users (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  token_hash text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON public.sessions(expires_at);

CREATE TABLE IF NOT EXISTS public.weekday_rosters (
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weekday text NOT NULL CHECK (
    weekday IN (
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday'
    )
  ),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, weekday)
);

CREATE TABLE IF NOT EXISTS public.weekday_teammates (
  user_id bigint NOT NULL,
  weekday text NOT NULL,
  teammate_id integer NOT NULL CHECK (teammate_id > 0),
  roster_order integer NOT NULL DEFAULT 0,
  completed_orders bigint NOT NULL DEFAULT 0 CHECK (completed_orders >= 0),
  pending_orders bigint NOT NULL DEFAULT 0 CHECK (pending_orders >= 0),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  status text NOT NULL CHECK (status IN ('working', 'break')),
  break_start_time text NOT NULL DEFAULT '' CHECK (
    break_start_time = '' OR
    break_start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  return_time text NOT NULL DEFAULT '' CHECK (
    return_time = '' OR
    return_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  PRIMARY KEY (user_id, weekday, teammate_id),
  FOREIGN KEY (user_id, weekday)
    REFERENCES public.weekday_rosters(user_id, weekday) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.weekday_order_progress (
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weekday text NOT NULL CHECK (
    weekday IN (
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday'
    )
  ),
  teammates jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_allocations jsonb,
  recent_batches jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, weekday)
);

CREATE TABLE IF NOT EXISTS public.quick_copy_notes (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 1000),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quick_copy_notes_user_position_idx
  ON public.quick_copy_notes(user_id, position, id);
