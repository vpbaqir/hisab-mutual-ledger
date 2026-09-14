-- ENUMS
CREATE TYPE public.transaction_status AS ENUM ('pending','active','partial','settled','disputed','rejected');
CREATE TYPE public.confirmation_type AS ENUM ('create','repayment');
CREATE TYPE public.repayment_status AS ENUM ('pending','confirmed','rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL,
  avatar_url text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_phone_key ON public.profiles (phone);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  lender_id uuid,
  borrower_id uuid,
  counterparty_name text NOT NULL DEFAULT '',
  counterparty_phone text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  note text,
  due_date date,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  activated_at timestamptz,
  settled_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- CONFIRMATIONS
CREATE TABLE public.confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  repayment_id uuid,
  user_id uuid NOT NULL,
  type public.confirmation_type NOT NULL DEFAULT 'create',
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.confirmations TO authenticated;
GRANT ALL ON public.confirmations TO service_role;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;

-- REPAYMENTS
CREATE TABLE public.repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  initiated_by uuid NOT NULL,
  status public.repayment_status NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.repayments TO authenticated;
GRANT ALL ON public.repayments TO service_role;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;

-- IDENTITY SNAPSHOTS (immutable)
CREATE TABLE public.identity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name_snapshot text NOT NULL,
  phone_snapshot text NOT NULL,
  avatar_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, user_id)
);
GRANT SELECT, INSERT ON public.identity_snapshots TO authenticated;
GRANT ALL ON public.identity_snapshots TO service_role;
ALTER TABLE public.identity_snapshots ENABLE ROW LEVEL SECURITY;

-- HELPERS
CREATE OR REPLACE FUNCTION public.current_phone()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.can_access_transaction(_tx uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = _tx
      AND (
        t.is_demo
        OR auth.uid() = t.lender_id
        OR auth.uid() = t.borrower_id
        OR (t.counterparty_phone <> '' AND t.counterparty_phone = public.current_phone())
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.shares_transaction(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE (auth.uid() = t.lender_id OR auth.uid() = t.borrower_id)
      AND (_other = t.lender_id OR _other = t.borrower_id)
  )
$$;

-- POLICIES: profiles
CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_demo OR public.shares_transaction(id));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- POLICIES: transactions
CREATE POLICY "participants read transactions" ON public.transactions FOR SELECT TO authenticated
  USING (
    is_demo
    OR auth.uid() = lender_id
    OR auth.uid() = borrower_id
    OR (counterparty_phone <> '' AND counterparty_phone = public.current_phone())
  );
CREATE POLICY "creator inserts transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND (auth.uid() = lender_id OR auth.uid() = borrower_id));
CREATE POLICY "participants update transactions" ON public.transactions FOR UPDATE TO authenticated
  USING (
    auth.uid() = lender_id
    OR auth.uid() = borrower_id
    OR (counterparty_phone <> '' AND counterparty_phone = public.current_phone())
  )
  WITH CHECK (
    auth.uid() = lender_id
    OR auth.uid() = borrower_id
    OR (counterparty_phone <> '' AND counterparty_phone = public.current_phone())
  );

-- POLICIES: confirmations
CREATE POLICY "read confirmations" ON public.confirmations FOR SELECT TO authenticated
  USING (public.can_access_transaction(transaction_id));
CREATE POLICY "insert own confirmations" ON public.confirmations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_transaction(transaction_id));
CREATE POLICY "update own confirmations" ON public.confirmations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- POLICIES: repayments
CREATE POLICY "read repayments" ON public.repayments FOR SELECT TO authenticated
  USING (public.can_access_transaction(transaction_id));
CREATE POLICY "insert repayments" ON public.repayments FOR INSERT TO authenticated
  WITH CHECK (initiated_by = auth.uid() AND public.can_access_transaction(transaction_id));
CREATE POLICY "update repayments" ON public.repayments FOR UPDATE TO authenticated
  USING (public.can_access_transaction(transaction_id))
  WITH CHECK (public.can_access_transaction(transaction_id));

-- POLICIES: identity snapshots (insert once, never update/delete)
CREATE POLICY "read snapshots" ON public.identity_snapshots FOR SELECT TO authenticated
  USING (public.can_access_transaction(transaction_id));
CREATE POLICY "insert snapshots" ON public.identity_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.can_access_transaction(transaction_id));

-- REALTIME
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.repayments REPLICA IDENTITY FULL;
ALTER TABLE public.confirmations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.repayments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.confirmations;

-- DEMO DATA
INSERT INTO public.profiles (id, full_name, phone, is_demo) VALUES
  ('11111111-1111-4111-8111-111111111111','Baq','+919000000001',true),
  ('22222222-2222-4222-8222-222222222222','Ahmed','+919000000002',true),
  ('33333333-3333-4333-8333-333333333333','Ali','+919000000003',true),
  ('44444444-4444-4444-8444-444444444444','Rahman','+919000000004',true);

INSERT INTO public.transactions (id, creator_id, lender_id, borrower_id, counterparty_name, counterparty_phone, amount, note, due_date, status, activated_at, is_demo, created_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Ahmed','+919000000002',500,'Lunch money',(now() + interval '7 days')::date,'active',now(),true, now() - interval '5 days'),
  ('aaaaaaaa-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Ali','+919000000003',1000,'Bike repair',(now() + interval '14 days')::date,'pending',NULL,true, now() - interval '1 day'),
  ('aaaaaaaa-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','Rahman','+919000000004',300,'Groceries',(now() - interval '2 days')::date,'settled',now() - interval '20 days',true, now() - interval '20 days');

INSERT INTO public.repayments (transaction_id, amount, initiated_by, status, confirmed_at, created_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000003',300,'44444444-4444-4444-8444-444444444444','confirmed', now() - interval '3 days', now() - interval '4 days');

INSERT INTO public.confirmations (transaction_id, user_id, type, confirmed, confirmed_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','create',true, now() - interval '5 days'),
  ('aaaaaaaa-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','create',true, now() - interval '5 days'),
  ('aaaaaaaa-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','create',true, now() - interval '1 day'),
  ('aaaaaaaa-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','create',true, now() - interval '20 days'),
  ('aaaaaaaa-0000-4000-8000-000000000003','44444444-4444-4444-8444-444444444444','create',true, now() - interval '20 days');

INSERT INTO public.identity_snapshots (transaction_id, user_id, name_snapshot, phone_snapshot) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Baq','+919000000001'),
  ('aaaaaaaa-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','Ahmed','+919000000002'),
  ('aaaaaaaa-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Baq','+919000000001'),
  ('aaaaaaaa-0000-4000-8000-000000000003','44444444-4444-4444-8444-444444444444','Rahman','+919000000004');