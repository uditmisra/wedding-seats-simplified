
CREATE OR REPLACE FUNCTION public.ensure_sample_plan()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := 'sample-maya-jordan';
  v_owner uuid := '00000000-0000-0000-0000-000000000001';
  v_plan_id uuid;
  v_scenario_id uuid;
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_t4 uuid;
  v_g_maya uuid; v_g_jordan uuid; v_g_adaeze uuid; v_g_daniel uuid;
  v_g_imani uuid; v_g_eleanor uuid; v_g_benjamin uuid; v_g_gabriela uuid;
  v_g_felix uuid; v_g_camila uuid; v_g_hiroki uuid; v_g_jasper uuid;
BEGIN
  SELECT id INTO v_plan_id FROM public.plans WHERE code = v_code;
  IF v_plan_id IS NOT NULL THEN
    RETURN v_code;
  END IF;

  INSERT INTO public.plans (code, name, event_date)
  VALUES (v_code, 'Maya & Jordan', NULL)
  RETURNING id INTO v_plan_id;

  INSERT INTO public.plan_owners (plan_id, user_id, role)
  VALUES (v_plan_id, v_owner, 'owner');

  INSERT INTO public.scenarios (plan_id, name, is_default)
  VALUES (v_plan_id, 'Default', true)
  RETURNING id INTO v_scenario_id;

  INSERT INTO public.tables_def (plan_id, scenario_id, name, capacity, shape, x, y)
  VALUES (v_plan_id, v_scenario_id, 'T1 · Family', 8, 'round', 0, 0) RETURNING id INTO v_t1;
  INSERT INTO public.tables_def (plan_id, scenario_id, name, capacity, shape, x, y)
  VALUES (v_plan_id, v_scenario_id, 'T2 · College', 10, 'round', 200, 0) RETURNING id INTO v_t2;
  INSERT INTO public.tables_def (plan_id, scenario_id, name, capacity, shape, x, y)
  VALUES (v_plan_id, v_scenario_id, 'T3 · Work', 8, 'round', 400, 0) RETURNING id INTO v_t3;
  INSERT INTO public.tables_def (plan_id, scenario_id, name, capacity, shape, x, y)
  VALUES (v_plan_id, v_scenario_id, 'T4 · Head table', 6, 'head', 200, 200) RETURNING id INTO v_t4;

  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Maya Okafor', 'Couple', 'attending', NULL, false) RETURNING id INTO v_g_maya;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Jordan Ross', 'Couple', 'attending', NULL, false) RETURNING id INTO v_g_jordan;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Adaeze Okafor', 'Family · Bride', 'attending', NULL, false) RETURNING id INTO v_g_adaeze;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Daniel Okonkwo', 'Family · Groom', 'attending', NULL, false) RETURNING id INTO v_g_daniel;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Imani Brown', 'Family · Groom', 'attending', 'V', false) RETURNING id INTO v_g_imani;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Eleanor Whitman', 'Family · Bride', 'attending', NULL, false) RETURNING id INTO v_g_eleanor;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Benjamin Ross', 'College · Bride', 'attending', NULL, false) RETURNING id INTO v_g_benjamin;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Gabriela Reyes', 'College · Bride', 'attending', NULL, false) RETURNING id INTO v_g_gabriela;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Felix Andersson', 'College · Groom', 'attending', 'V', false) RETURNING id INTO v_g_felix;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Camila Vargas', 'Work · Groom', 'maybe', 'GF', false) RETURNING id INTO v_g_camila;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Hiroki Tanaka', 'Work · Bride', 'attending', NULL, false) RETURNING id INTO v_g_hiroki;
  INSERT INTO public.guests (plan_id, name, party, rsvp, meal, is_kid) VALUES
    (v_plan_id, 'Jasper Lindqvist', 'Family · Bride', 'maybe', NULL, false) RETURNING id INTO v_g_jasper;

  INSERT INTO public.assignments (plan_id, scenario_id, guest_id, table_id, seat_index, pinned) VALUES
    (v_plan_id, v_scenario_id, v_g_maya, v_t4, 0, false),
    (v_plan_id, v_scenario_id, v_g_jordan, v_t4, 1, false),
    (v_plan_id, v_scenario_id, v_g_adaeze, v_t1, 2, false),
    (v_plan_id, v_scenario_id, v_g_daniel, v_t1, 3, false),
    (v_plan_id, v_scenario_id, v_g_imani, v_t1, 4, false),
    (v_plan_id, v_scenario_id, v_g_eleanor, v_t1, 5, false),
    (v_plan_id, v_scenario_id, v_g_benjamin, v_t2, 6, false),
    (v_plan_id, v_scenario_id, v_g_gabriela, v_t2, 7, false),
    (v_plan_id, v_scenario_id, v_g_felix, v_t2, 0, false),
    (v_plan_id, v_scenario_id, v_g_hiroki, v_t3, 2, false);

  INSERT INTO public.constraints_def (plan_id, guest_a, guest_b, kind) VALUES
    (v_plan_id, v_g_benjamin, v_g_gabriela, 'with'),
    (v_plan_id, v_g_felix, v_g_hiroki, 'not_with');

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_sample_plan() TO anon, authenticated;
