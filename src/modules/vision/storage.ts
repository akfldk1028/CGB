/** 이미지 저장 — Vercel Blob (프로덕션) or base64 (개발용)
 *
 * BLOB_READ_WRITE_TOKEN 있으면 → Vercel Blob
 * 없으면 → base64 data URI 반환 (로컬 개발용, 노드 속성에 직접 저장)
 */

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string;
  size: number;
  mode: 'blob' | 'base64';
}

/** 이미지 파일 업로드 */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (file.size > MAX_SIZE) {
    throw new Error(`Image too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 5MB)`);
  }

  // Vercel Blob 모드
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`creative-graph/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });
    return { url: blob.url, size: file.size, mode: 'blob' };
  }

  // Base64 fallback (개발용)
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = file.type || 'image/png';
  const dataUri = `data:${mimeType};base64,${base64}`;

  return { url: dataUri, size: file.size, mode: 'base64' };
}

/** URL에서 이미지 다운로드 → base64 (에이전트가 외부 URL 분석 시) */
export async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

  const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10);
  if (contentLength > MAX_SIZE) throw new Error('Image too large');

  const buffer = await res.arrayBuffer();
  const mimeType = res.headers.get('content-type') ?? 'image/png';
  return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
}
