import { NextResponse } from 'next/server';
import { scamperTransform, scamperFullSweep } from '@/modules/creativity/techniques/scamper';
import type { Idea, ScamperType } from '@/types/creativity';
import type { ApiResponse } from '@/types/api';

export async function POST(request: Request) {
  try {
    const { idea, technique, fullSweep = false } = (await request.json()) as {
      idea: Idea;
      technique?: ScamperType;
      fullSweep?: boolean;
    };

    if (!idea) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'idea is required' },
        { status: 400 }
      );
    }

    if (fullSweep) {
      const results = await scamperFullSweep(idea);
      return NextResponse.json<ApiResponse>({ success: true, data: { results } });
    }

    if (!technique) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'technique or fullSweep=true required' },
        { status: 400 }
      );
    }

    const result = await scamperTransform(idea, technique);
    return NextResponse.json<ApiResponse>({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
