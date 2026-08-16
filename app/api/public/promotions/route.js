import { NextResponse } from 'next/server';
import { getLivePromotions, publicPromotion } from '../../../../lib/promotions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const promotions = (await getLivePromotions()).map(publicPromotion);
    return NextResponse.json({ promotions });
  } catch (error) {
    console.error('Public promotions API error:', error);
    return NextResponse.json({ promotions: [] }, { status: 500 });
  }
}
