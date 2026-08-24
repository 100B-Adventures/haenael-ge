ALTER TYPE public.notification_type_enum
  ADD VALUE IF NOT EXISTS 'CASHOUT_REQUESTED';

ALTER TYPE public.notification_type_enum
  ADD VALUE IF NOT EXISTS 'CASHOUT_PAID';
