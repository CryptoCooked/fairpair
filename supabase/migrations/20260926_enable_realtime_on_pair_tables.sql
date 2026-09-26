-- Applied to project bhqcazsrvyihxstezope on 2026-09-26.
-- Broadcast changes so both partners see updates live.
ALTER TABLE public.expenses    REPLICA IDENTITY FULL;
ALTER TABLE public.messages    REPLICA IDENTITY FULL;
ALTER TABLE public.settlements REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='expenses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='settlements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
  END IF;
END $$;
