-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all three tables
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_offers   ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- Remove anonymous (unauthenticated) table-level privileges.
-- This prevents the tables from appearing in the GraphQL schema for anon users
-- and adds a defence-in-depth layer on top of RLS policies.
-- Your service-role key (supabaseAdmin) is unaffected — it bypasses both.
-- ────────────────────────────────────────────────────────────────────────────
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles       FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.buyer_requests FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.dealer_offers  FROM anon;


-- ────────────────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"  ON public.profiles;

-- Any signed-in user can read any profile.
-- (Buyers need to read dealer display_name when viewing offers.)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- A user can only create their own profile row.
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- A user can only update their own profile row.
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ────────────────────────────────────────────────────────────────────────────
-- buyer_requests
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "buyer_requests_select" ON public.buyer_requests;
DROP POLICY IF EXISTS "buyer_requests_insert" ON public.buyer_requests;

-- Buyers see all their own requests (any status).
-- Dealers see all open requests for browsing.
CREATE POLICY "buyer_requests_select"
  ON public.buyer_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id
    OR status = 'open'
  );

-- Buyers can only insert requests that belong to themselves.
-- (The /buyer/requests/new page inserts directly with the anon client.)
CREATE POLICY "buyer_requests_insert"
  ON public.buyer_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- No direct UPDATE from the client — all updates go through API routes
-- that use the service-role key, which bypasses RLS.


-- ────────────────────────────────────────────────────────────────────────────
-- dealer_offers
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "dealer_offers_select" ON public.dealer_offers;
DROP POLICY IF EXISTS "dealer_offers_insert" ON public.dealer_offers;
DROP POLICY IF EXISTS "dealer_offers_update" ON public.dealer_offers;

-- Dealers see their own offers.
-- Buyers see offers that belong to one of their requests.
CREATE POLICY "dealer_offers_select"
  ON public.dealer_offers FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.buyer_requests br
      WHERE br.id = dealer_offers.request_id
        AND br.buyer_id = auth.uid()
    )
  );

-- Dealers can only submit offers as themselves.
CREATE POLICY "dealer_offers_insert"
  ON public.dealer_offers FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

-- Dealers can update only their own offers.
-- (The offer form on /dealer/requests/[id]/offer uses the anon client.)
CREATE POLICY "dealer_offers_update"
  ON public.dealer_offers FOR UPDATE
  TO authenticated
  USING  (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());
