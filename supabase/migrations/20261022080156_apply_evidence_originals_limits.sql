-- Evidence originals remain private and are constrained to the approved intake contract.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'video/mp4']::text[]
where id = 'evidence-originals';
