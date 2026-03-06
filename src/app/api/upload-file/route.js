import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/upload-file
 *
 * Server-side file upload proxy for Supabase Storage.
 * This avoids mobile browser issues where client-side file.arrayBuffer()
 * or fetch() with large binary bodies can hang silently.
 *
 * Expects multipart/form-data with:
 *   - file:        the file to upload
 *   - filePath:    destination path in the bucket (must start with user's ID)
 *   - contentType: MIME type for the file
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

        // Parse the multipart form data
        const formData = await request.formData();
        const file = formData.get('file');
        const filePath = formData.get('filePath');
        const contentType = formData.get('contentType');

        if (!file || !filePath) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos (file, filePath)' },
                { status: 400 }
            );
        }

        // Security: ensure the file path starts with the authenticated user's ID
        if (!filePath.startsWith(user.id + '/')) {
            return NextResponse.json(
                { error: 'Path de archivo no autorizado' },
                { status: 403 }
            );
        }

        // Convert the File/Blob to ArrayBuffer server-side (Node.js — always reliable)
        const fileBuffer = await file.arrayBuffer();

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('print-files')
            .upload(filePath, fileBuffer, {
                contentType: contentType || file.type || 'application/octet-stream',
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json(
                { error: uploadError.message || 'Error al subir archivo' },
                { status: 500 }
            );
        }

        return NextResponse.json({ filePath });

    } catch (err) {
        console.error('Upload API error:', err);
        return NextResponse.json(
            { error: err.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
