import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/create-order
 *
 * Server-side order creation proxy.
 * The client-side Supabase SDK can hang on some mobile browsers,
 * so this route handles the print_orders INSERT server-side.
 *
 * Expects JSON body with:
 *   - file_urls:      array of uploaded file paths
 *   - location_id:    selected printing location ID
 *   - specifications: { size, quality, copies, color }
 *   - total_amount:   calculated total
 *   - points_earned:  calculated points
 *   - notes:          optional notes string
 */
export async function POST(request) {
    try {
        const supabase = await createClient();

        // Validate authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { file_urls, location_id, specifications, total_amount, points_earned, notes } = body;

        // Validate required fields
        if (!file_urls?.length || !location_id || !specifications || total_amount == null) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            );
        }

        // Security: ensure all file paths belong to the authenticated user
        const allPathsOwned = file_urls.every(path => path.startsWith(user.id + '/'));
        if (!allPathsOwned) {
            return NextResponse.json(
                { error: 'Archivos no autorizados' },
                { status: 403 }
            );
        }

        // Insert the order
        const { data: order, error: insertError } = await supabase
            .from('print_orders')
            .insert({
                customer_id: user.id,
                location_id,
                file_urls,
                specifications,
                total_amount,
                points_earned: points_earned || 0,
                status: 'pendiente',
                notes: notes || null,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Order insert error:', insertError);
            return NextResponse.json(
                { error: insertError.message || 'Error al crear la orden' },
                { status: 500 }
            );
        }

        return NextResponse.json({ order });

    } catch (err) {
        console.error('Create order API error:', err);
        return NextResponse.json(
            { error: err.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
