-- CreateView
CREATE OR REPLACE VIEW enquiry_triage_view AS
SELECT
  "id",
  "mode",
  "type",
  "status",
  "priority",
  "queue",
  "assignedTo",
  "createdAt",
  "slaDueAt",
  "firstRespondedAt",
  -- sla_breached: true if slaDueAt is not null and now() > slaDueAt
  CASE
    WHEN "slaDueAt" IS NULL THEN false
    ELSE NOW() > "slaDueAt"
  END AS sla_breached,
  -- sla_minutes_remaining: null if slaDueAt is null, else minutes between slaDueAt and now (negative if overdue)
  CASE
    WHEN "slaDueAt" IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM ("slaDueAt" - NOW())) / 60
  END::INTEGER AS sla_minutes_remaining
FROM "Enquiry";
