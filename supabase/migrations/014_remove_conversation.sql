-- =============================================================================
-- 014 - Remove Conversation session type from operational data
--
-- The product now uses a single Grammar session. Conversation rows are removed
-- from schedule/progress/attendance/curriculum. The session_type enum value is
-- left in place (Postgres cannot drop enum values safely in-place), but the
-- application treats "grammar" as the only valid session.
-- =============================================================================

-- Remove conversation-dependent rows first (children before parents).
delete from public.attendance where session_type = 'conversation';
delete from public.batch_progress where session_type = 'conversation';
delete from public.batch_schedule where session_type = 'conversation';
delete from public.topic_assignments where session_type = 'conversation';
delete from public.topics where session_type = 'conversation';
delete from public.modules where session_type = 'conversation';
delete from public.levels where session_type = 'conversation';

-- Batches no longer track a conversation level.
update public.batches
set current_conversation_level_id = null
where current_conversation_level_id is not null;
