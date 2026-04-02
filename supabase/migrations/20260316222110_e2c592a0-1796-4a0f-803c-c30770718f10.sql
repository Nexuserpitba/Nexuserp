
CREATE TABLE public.connection_test (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow anyone to read/insert for testing purposes
ALTER TABLE public.connection_test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.connection_test
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON public.connection_test
  FOR INSERT WITH CHECK (true);
