
-- Profiles table for technicians
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'concluido')),
  
  -- Section A: Client
  client_name TEXT,
  client_cnpj TEXT,
  client_email TEXT,
  client_address TEXT,
  client_additional_info TEXT,

  -- Section B: Visit
  service_type TEXT CHECK (service_type IN ('instalacao', 'preventiva', 'corretiva')),
  vehicle_km NUMERIC,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,

  -- Section D: PMOC
  pmoc_month TEXT,
  pmoc_period TEXT CHECK (pmoc_period IN ('mensal', 'trimestral', 'semestral', 'anual')),
  pmoc_filter_clean TEXT CHECK (pmoc_filter_clean IN ('conforme', 'nao_conforme', 'nao_aplica')),
  pmoc_filter_fix TEXT CHECK (pmoc_filter_fix IN ('conforme', 'nao_conforme')),
  pmoc_cabinet_air TEXT CHECK (pmoc_cabinet_air IN ('conforme', 'nao_conforme')),
  pmoc_cabinet_buttons TEXT CHECK (pmoc_cabinet_buttons IN ('conforme', 'nao_conforme')),

  -- Section E: Details
  problem_description TEXT,
  service_performed TEXT,

  -- Section G: Signature
  signature_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON public.reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON public.reports FOR DELETE USING (auth.uid() = user_id);

-- Equipment table (Section C)
CREATE TABLE public.report_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_equipment ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_report_owner(p_report_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reports WHERE id = p_report_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Users can manage own equipment" ON public.report_equipment FOR ALL USING (public.is_report_owner(report_id));

-- Photos table (Section F)
CREATE TABLE public.report_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own photos" ON public.report_photos FOR ALL USING (public.is_report_owner(report_id));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- Storage policies
CREATE POLICY "Users can upload report photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'report-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own report photos" ON storage.objects FOR SELECT USING (bucket_id = 'report-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own report photos" ON storage.objects FOR DELETE USING (bucket_id = 'report-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload signatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures' AND auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
