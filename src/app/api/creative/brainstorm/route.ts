import { NextResponse } from 'next/server';
import { divergeConvergeCycle } from '@/modules/creativity/pipeline/diverge-converge';
import type { ApiResponse } from '@/types/api';

export async function POST(request: Request) {
  try {
    const { topic, domain, count = 10, topK = 5 } = await request.json();

    if (!topic || !domain) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'topic and domain are required' },
        { status: 400 }
      );
    }

    const result = await divergeConvergeCycle(topic, domain, count, topK);
    return NextResponse.json<ApiResponse>({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
