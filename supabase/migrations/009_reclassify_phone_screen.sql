-- 009: Phone Screen status removed from UI; existing rows merged into Interview.
-- The Phone Screen stage was not distinct enough to warrant its own column;
-- existing jobs at that stage are reclassified to Interview (in-progress).
-- Rollback: none automatic — once merged, the original phone_screen distinction
-- is lost. Restore from a point-in-time backup if needed.

update applications
set data = jsonb_set(data, '{status}', '"interview"', true),
    updated_at = now()
where data->>'status' = 'phone_screen';
