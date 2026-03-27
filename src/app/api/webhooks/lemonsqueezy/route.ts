/** LemonSqueezy Webhook — 결제 이벤트 처리
 *
 * 이벤트:
 * - subscription_created → 유저 티어 업그레이드
 * - subscription_updated → 플랜 변경
 * - subscription_cancelled → 다운그레이드 (기간 만료 후)
 * - subscription_expired → 즉시 다운그레이드
 *
 * 검증: LEMONSQUEEZY_WEBHOOK_SECRET으로 HMAC-SHA256 서명 검증
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { upgradeTier, downgradeTier } from '@/modules/payment/usage';
import { generateApiKey, storeApiKey, revokeApiKey, getUserMeta } from '@/lib/api-keys';

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // HMAC 서명 검증
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');

  const sigBuf = Buffer.from(signature);
  const digestBuf = Buffer.from(digest);
  if (sigBuf.length !== digestBuf.length || !crypto.timingSafeEqual(sigBuf, digestBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const eventName = payload.meta?.event_name as string;
  const customData = payload.meta?.custom_data as Record<string, string> | undefined;
  const userId = customData?.user_id;

  if (!userId) {
    // custom_data에 user_id가 없으면 처리 불가
    return NextResponse.json({ received: true, skipped: true, reason: 'No user_id in custom_data' });
  }

  const subscriptionId = String(payload.data?.id ?? '');
  const variantId = String(payload.data?.attributes?.variant_id ?? '');

  // variant_id로 티어 결정 (LemonSqueezy 설정에 따라 변경)
  const PRO_VARIANT = process.env.LEMONSQUEEZY_PRO_VARIANT_ID ?? '';
  const ENTERPRISE_VARIANT = process.env.LEMONSQUEEZY_ENTERPRISE_VARIANT_ID ?? '';

  function getTierFromVariant(vid: string): 'pro' | 'enterprise' {
    if (vid === ENTERPRISE_VARIANT) return 'enterprise';
    return 'pro'; // default to pro
  }

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_resumed': {
      const tier = getTierFromVariant(variantId);
      upgradeTier(userId, tier, subscriptionId);

      // API 키 자동 발급 (기존 키가 없을 때만)
      const existing = await getUserMeta(userId);
      let apiKeyGenerated: string | undefined;
      if (!existing?.keyHash) {
        const { raw, hash } = generateApiKey();
        const email = customData?.email;
        await storeApiKey(hash, userId, tier, subscriptionId, email);
        apiKeyGenerated = raw;
        console.log(`[webhook] ${eventName}: user=${userId} tier=${tier} apiKey=generated`);
      } else {
        console.log(`[webhook] ${eventName}: user=${userId} tier=${tier} apiKey=existing`);
      }
      break;
    }

    case 'subscription_updated': {
      const tier = getTierFromVariant(variantId);
      upgradeTier(userId, tier, subscriptionId);
      console.log(`[webhook] ${eventName}: user=${userId} tier=${tier}`);
      break;
    }

    case 'subscription_cancelled':
    case 'subscription_expired': {
      downgradeTier(userId);
      // 키는 폐기하지 않음 — Free 티어로 제한된 접근 유지
      const user = await getUserMeta(userId);
      if (user) {
        await storeApiKey(user.keyHash, userId, 'free', undefined, user.email);
      }
      console.log(`[webhook] ${eventName}: user=${userId} downgraded to free`);
      break;
    }

    default:
      console.log(`[webhook] unhandled event: ${eventName}`);
  }

  return NextResponse.json({ received: true, event: eventName, userId });
}
