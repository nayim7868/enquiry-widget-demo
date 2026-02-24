-- FixFunction: Fix return type mismatch by using RETURNS SETOF "Enquiry"
-- Drop existing function first (Postgres cannot change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS set_enquiry_status(text,text,text,text,text,text);

CREATE FUNCTION set_enquiry_status(
  p_enquiry_id text,
  p_new_status text,
  p_actor_email text,
  p_actor_role text DEFAULT 'ADMIN',
  p_user_agent text DEFAULT NULL,
  p_ip text DEFAULT NULL
)
RETURNS SETOF "Enquiry" AS $$
DECLARE
  v_current_row RECORD;
  v_new_first_responded_at timestamp(3);
  v_before_status text;
  v_before_first_responded_at timestamp(3);
BEGIN
  -- Find the current enquiry row by id (using alias cur_e)
  SELECT cur_e.* INTO v_current_row
  FROM "Enquiry" cur_e
  WHERE cur_e."id" = p_enquiry_id;

  -- If not found, return no rows (API will treat as 404)
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Store before values for audit log
  v_before_status := v_current_row."status";
  v_before_first_responded_at := v_current_row."firstRespondedAt";

  -- Compute the new firstRespondedAt:
  -- If p_new_status = 'CONTACTED' and current "firstRespondedAt" is null, set to now()
  -- Otherwise keep existing value
  IF p_new_status = 'CONTACTED' AND v_current_row."firstRespondedAt" IS NULL THEN
    v_new_first_responded_at := NOW();
  ELSE
    v_new_first_responded_at := v_current_row."firstRespondedAt";
  END IF;

  -- Update the row's "status" and "firstRespondedAt" (using alias upd_e)
  UPDATE "Enquiry" upd_e
  SET
    "status" = p_new_status::"EnquiryStatus",
    "firstRespondedAt" = v_new_first_responded_at
  WHERE upd_e."id" = p_enquiry_id;

  -- Insert an "AuditLog" row
  INSERT INTO "AuditLog" (
    "id",
    "createdAt",
    "actorEmail",
    "actorRole",
    "action",
    "entityType",
    "entityId",
    "changes",
    "userAgent",
    "ip"
  ) VALUES (
    gen_random_uuid()::text,
    NOW(),
    p_actor_email,
    p_actor_role,
    'ENQUIRY_UPDATE',
    'Enquiry',
    p_enquiry_id,
    jsonb_build_object(
      'before', jsonb_build_object(
        'status', v_before_status,
        'firstRespondedAt', v_before_first_responded_at
      ),
      'after', jsonb_build_object(
        'status', p_new_status,
        'firstRespondedAt', v_new_first_responded_at
      )
    ),
    p_user_agent,
    p_ip
  );

  -- Return the updated enquiry row (using alias e, return e.* to match SETOF "Enquiry")
  RETURN QUERY
  SELECT e.*
  FROM "Enquiry" e
  WHERE e."id" = p_enquiry_id;
END;
$$ LANGUAGE plpgsql;
