-- Create table for folders
CREATE TABLE public.resource_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  parent_id uuid REFERENCES public.resource_folders(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for files and notes
CREATE TABLE public.resource_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id uuid REFERENCES public.resource_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'image', 'document', 'note'
  url text,
  content text,
  size bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create bucket for resources (Note: if you don't have rights to run this via SQL, create the bucket manually in the dashboard)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public bucket access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'resources' );

CREATE POLICY "Allow Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'resources' );

CREATE POLICY "Allow Deletes" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'resources' );
