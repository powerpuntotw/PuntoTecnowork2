-- Function to securely and completely delete a user account and all its related data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid uuid;
BEGIN
    -- Get the ID of the currently authenticated user calling this function
    current_uid := auth.uid();
    
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Delete related point history and redemption records constraints
    DELETE FROM public.points_transactions WHERE user_id = current_uid;
    DELETE FROM public.reward_redemptions WHERE user_id = current_uid;

    -- 3. Delete points account
    DELETE FROM public.points_accounts WHERE user_id = current_uid;

    -- 4. Delete print orders (if they are a customer)
    DELETE FROM public.print_orders WHERE customer_id = current_uid;

    -- 5. Delete profile
    DELETE FROM public.profiles WHERE id = current_uid;

    -- 6. Finally, delete the auth.users record (This requires the SECURITY DEFINER and auth search_path)
    DELETE FROM auth.users WHERE id = current_uid;
END;
$$;
