import { NextResponse } from 'next/server';
import { uploadImage } from '@/modules/vision/storage';
import type { ApiResponse } from '@/types/api';

/** POST /api/vision/upload — 이미지 업로드 (multipart/form-data) */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'file field is required (multipart/form-data)' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Invalid file type: ${file.type}. Only images allowed.` },
        { status: 400 }
      );
    }

    const result = await uploadImage(file);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
