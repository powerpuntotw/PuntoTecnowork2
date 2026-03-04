-- Trigger to automatically create a points_account when a new client profile is created
CREATE OR REPLACE FUNCTION public.handle_new_client_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create points account for clients
  IF NEW.user_type = 'client' THEN
    INSERT INTO public.points_accounts (user_id, current_points, lifetime_points, tier_level)
    VALUES (NEW.id, 0, 0, 'bronze')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid errors on run
DROP TRIGGER IF EXISTS on_client_profile_created ON public.profiles;

-- Create the trigger
CREATE TRIGGER on_client_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_client_profile();
