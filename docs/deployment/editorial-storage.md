# Editorial Storage Deployment

## Bucket

- **Name:** `editorial`
- **Visibility:** public read on objects; writes restricted to service role
- **Env var:** `SUPABASE_STORAGE_BUCKET=editorial`

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public base URL for absolute asset links |
| `SUPABASE_SECRET_KEY` | Server-side Storage uploads and deletes |
| `SUPABASE_STORAGE_BUCKET` | Bucket name (`editorial`) |

## Upload limits

- MIME types: JPEG, PNG, WebP
- Max size: 2 MiB per file

## Preview setup checklist

1. Create bucket `editorial` in Supabase Preview.
2. Enable public object reads for the bucket.
3. Keep write/delete policies on service role only.
4. Set `SUPABASE_STORAGE_BUCKET=editorial` in Preview env.
5. Deploy app with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

## Rollback

- Revert app deploy if editorial routes fail.
- Keep bucket and objects intact; DB migration rollback removes editorial rows but not Storage objects.

## Orphan cleanup

After deleting editorial records, failed Storage cleanup is logged as `editorial_storage_cleanup_failed`.
Review Supabase Storage under `seasons/{seasonId}/...` and remove orphaned objects manually if needed.

## Smoke test

1. Create a draft article → mobile API returns 404.
2. Publish article → mobile API returns 200.
3. Upload three gallery photos, reorder → API order matches admin order.
4. Create active HOME sponsor → appears in mobile home feed.
