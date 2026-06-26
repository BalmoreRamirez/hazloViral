import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VerificationResult {
  followers: number;
  engagement_rate: number;
}

const SUPPORTED = ['Instagram', 'TikTok', 'Facebook']; // YouTube: manual (sin API)

@Injectable()
export class SocialVerificationService {
  private readonly logger = new Logger(SocialVerificationService.name);

  constructor(private readonly config: ConfigService) {}

  isSupported(platform: string): boolean {
    return SUPPORTED.includes(platform);
  }

  async verify(platform: string, username: string): Promise<VerificationResult | null> {
    const clean = username.replace(/^@/, '').trim();
    try {
      if (platform === 'Instagram') return await this.verifyInstagram(clean);
      if (platform === 'TikTok')    return await this.verifyTikTok(clean);
      if (platform === 'Facebook')  return await this.verifyFacebook(clean);
    } catch (err: any) {
      this.logger.warn(`${platform} verification failed for @${clean}: ${err?.message}`);
    }
    return null;
  }

  private get rapidApiKey(): string {
    return this.config.get<string>('RAPIDAPI_KEY') ?? '';
  }

  private async verifyInstagram(username: string): Promise<VerificationResult | null> {
    const host = this.config.get<string>('IG_RAPIDAPI_HOST') ?? 'instagram-scraper-stable.p.rapidapi.com';
    const path = this.config.get<string>('IG_RAPIDAPI_PATH') ?? `/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`;
    const url  = `https://${host}${path.includes('{u}') ? path.replace('{u}', encodeURIComponent(username)) : path}`;

    this.logger.warn(`[IG] → ${url}`);
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key':  this.rapidApiKey,
        'x-rapidapi-host': host,
      },
    });

    const raw = await res.text();
    this.logger.warn(`[IG] status=${res.status} body=${raw.slice(0, 500)}`);

    if (!res.ok) return null;

    const json = JSON.parse(raw);

    // Intenta varios formatos de respuesta comunes entre scrapers de RapidAPI
    // instagram-scraper-stable-api devuelve { user_data: { follower_count } }
    const user = json?.user_data ?? json?.data?.user ?? json?.data ?? json?.user ?? json;
    const followers =
      user?.follower_count ??
      user?.followers ??
      user?.edge_followed_by?.count ??
      user?.userInfo?.stats?.followerCount ??
      0;

    if (!followers) {
      this.logger.warn(`[IG] followers=0, user keys=${Object.keys(user ?? {}).join(',')}`);
      return null;
    }
    return { followers: Number(followers), engagement_rate: 0 };
  }

  private async verifyTikTok(username: string): Promise<VerificationResult | null> {
    const host = this.config.get<string>('TT_RAPIDAPI_HOST') ?? 'tiktok-scraper7.p.rapidapi.com';
    const path = this.config.get<string>('TT_RAPIDAPI_PATH') ?? `/user/info?uniqueId={u}`;
    const url  = `https://${host}${path.replace('{u}', encodeURIComponent(username))}`;

    this.logger.warn(`[TT] → ${url}`);
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key':  this.rapidApiKey,
        'x-rapidapi-host': host,
      },
    });

    const raw = await res.text();
    this.logger.warn(`[TT] status=${res.status} body=${raw.slice(0, 500)}`);

    if (!res.ok) return null;

    const json = JSON.parse(raw);
    const stats = json?.data?.userInfo?.stats ?? json?.userInfo?.stats ?? json?.data?.stats;
    if (!stats) {
      this.logger.warn(`[TT] stats not found, top-level keys=${Object.keys(json ?? {}).join(',')}`);
      return null;
    }
    const followers = stats.followerCount ?? stats.followers ?? 0;
    const hearts    = stats.heartCount ?? stats.diggCount ?? 0;
    const engagement_rate = parseFloat(((hearts / Math.max(followers, 1)) * 100).toFixed(2));
    return { followers: Number(followers), engagement_rate };
  }

  private async verifyFacebook(username: string): Promise<VerificationResult | null> {
    const url = `https://facebook-scraper3.p.rapidapi.com/page/info?page_name=${encodeURIComponent(username)}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key':  this.rapidApiKey,
        'x-rapidapi-host': 'facebook-scraper3.p.rapidapi.com',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const page = json?.data ?? json;
    const followers = page?.followers_count ?? page?.fan_count ?? page?.fans ?? 0;
    if (!followers) return null;
    return { followers: Number(followers), engagement_rate: 0 };
  }
}
