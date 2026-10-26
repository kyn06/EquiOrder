
CREATE TABLE IF NOT EXISTS public.weekday_rosters (
  weekday text PRIMARY KEY CHECK (
    weekday IN (
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday'
    )
  ),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekday_teammates (
  weekday text NOT NULL
    REFERENCES public.weekday_rosters(weekday) ON DELETE CASCADE,
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
  PRIMARY KEY (weekday, teammate_id)
);

ALTER TABLE public.weekday_teammates
  ADD COLUMN IF NOT EXISTS roster_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.weekday_teammates
  ADD COLUMN IF NOT EXISTS completed_orders bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_orders bigint NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.weekday_order_progress (
  weekday text PRIMARY KEY CHECK (
    weekday IN (
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday'
    )
  ),
  teammates jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_allocations jsonb,
  recent_batches jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
