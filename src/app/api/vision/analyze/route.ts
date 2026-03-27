import { NextResponse } from 'next/server';
import { analyzeImage } from '@/modules/vision/analyze';
import { extractSceneGraph } from '@/modules/vision/scene-graph';
import type { ApiResponse } from '@/types/api';

/** POST /api/vision/analyze — 이미지 분석 + Scene Graph 추출 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, context } = body;

    if (!imageUrl) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const analysis = await analyzeImage(imageUrl, context);
    const sceneGraph = extractSceneGraph(analysis, imageUrl);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { analysis, sceneGraph, imageUrl },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

export const maxDuration = 30;
