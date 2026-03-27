import { NextResponse } from 'next/server';
import { convergentSelect } from '@/modules/creativity/theories/guilford';
import type { Idea } from '@/types/creativity';
import type { ApiResponse } from '@/types/api';

export async function POST(request: Request) {
  try {
    const { ideas, domain, criteria } = (await request.json()) as {
      ideas: Idea[];
      domain: string;
      criteria?: string[];
    };

    if (!ideas?.length || !domain) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ideas array and domain are required' },
        { status: 400 }
      );
    }

    const result = await convergentSelect(ideas, domain, criteria);
    return NextResponse.json<ApiResponse>({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
