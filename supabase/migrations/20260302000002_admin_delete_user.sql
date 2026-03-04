-- Function to securely and completely delete a specific user account by an Admin
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid uuid;
    admin_role text;
BEGIN
    -- Get the ID of the currently authenticated user calling this function
    current_uid := auth.uid();
    
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if the current user is an admin
    SELECT user_type INTO admin_role FROM public.profiles WHERE id = current_uid;
    
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Permission denied: Only administrators can delete other users';
    END IF;

    -- 2. Delete related point history and redemption records
    DELETE FROM public.points_transactions WHERE user_id = target_user_id;
    DELETE FROM public.reward_redemptions WHERE user_id = target_user_id;

    -- 3. Delete points account
    DELETE FROM public.points_accounts WHERE user_id = target_user_id;

    -- 4. Delete print orders (if they are a customer)
    DELETE FROM public.print_orders WHERE customer_id = target_user_id;

    -- 5. Delete profile
    DELETE FROM public.profiles WHERE id = target_user_id;

    -- 6. Finally, delete the auth.users record
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
