import type { Locale, UserRole } from '@artisangh/shared-types';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  locale: Locale;
  avatarUrl?: string | null;
}

export interface VerifyOtpResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ArtisanProfile {
  id: string;
  userId: string;
  trades: string[];
  bio?: string | null;
  yearsExperience: number;
  hourlyRate?: string | null;
  currency: string;
  serviceRadiusKm: number;
  baseAddress?: string | null;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  user?: {
    id: string;
    fullName: string;
    phone: string;
    avatarUrl?: string | null;
  };
}

export interface ArtisanSearchResult {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  trades: string[];
  ratingAvg: number;
  jobsCompleted: number;
  hourlyRate?: string | null;
  distanceM: number;
  verified: boolean;
}

export interface SearchArtisansParams {
  trade?: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
  verifiedOnly?: boolean;
}

export interface UpsertArtisanProfileBody {
  trades: string[];
  bio?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  currency?: 'GHS';
  serviceRadiusKm?: number;
  baseLocation: { lat: number; lng: number };
  baseAddress?: string;
}

export type VerificationStatusValue =
  | 'UNVERIFIED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export interface VerificationStatus {
  status: VerificationStatusValue;
  ghanaCardLast4?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

export interface AdminVerificationRow {
  id: string;
  userId: string;
  status: VerificationStatusValue;
  ghanaCardLast4?: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
    locale: string;
  };
}

export interface AdminVerificationDetail extends AdminVerificationRow {
  rejectionReason?: string | null;
  signedUrls: {
    front: string | null;
    back: string | null;
    selfie: string | null;
  };
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => Promise<string | null>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(private readonly opts: ApiClientOptions) {}

  requestOtp(phone: string): Promise<void> {
    return this.fetch('POST', '/auth/otp/request', { body: { phone } });
  }

  verifyOtp(input: {
    phone: string;
    code: string;
    fullName?: string;
    role?: UserRole;
  }): Promise<VerifyOtpResponse> {
    return this.fetch('POST', '/auth/otp/verify', { body: input });
  }

  refresh(): Promise<{ accessToken: string }> {
    return this.fetch('POST', '/auth/refresh', {});
  }

  logout(): Promise<void> {
    return this.fetch('POST', '/auth/logout', {});
  }

  me(): Promise<AuthUser & { artisanProfile?: ArtisanProfile | null }> {
    return this.fetch('GET', '/users/me', {});
  }

  updateMe(
    input: Partial<Pick<AuthUser, 'fullName' | 'locale' | 'avatarUrl'>> & {
      email?: string;
    },
  ) {
    return this.fetch('PATCH', '/users/me', { body: input });
  }

  upsertArtisanProfile(
    input: UpsertArtisanProfileBody,
  ): Promise<ArtisanProfile> {
    return this.fetch('PUT', '/artisans/me', { body: input });
  }

  myArtisanProfile(): Promise<ArtisanProfile> {
    return this.fetch('GET', '/artisans/me', {});
  }

  searchArtisans(params: SearchArtisansParams): Promise<ArtisanSearchResult[]> {
    return this.fetch('GET', '/artisans', {
      query: params as unknown as Record<string, unknown>,
    });
  }

  artisanById(id: string): Promise<ArtisanProfile> {
    return this.fetch('GET', `/artisans/${encodeURIComponent(id)}`, {});
  }

  // ── Verification ─────────────────────────────────────────
  startVerification(input: {
    frontContentType: string;
    backContentType: string;
    selfieContentType: string;
  }): Promise<{
    bucket: string;
    front: { key: string; url: string };
    back: { key: string; url: string };
    selfie: { key: string; url: string };
  }> {
    return this.fetch('POST', '/verification/start', { body: input });
  }

  submitVerification(input: {
    ghanaCardNumber: string;
    frontKey: string;
    backKey: string;
    selfieKey: string;
  }): Promise<VerificationStatus> {
    return this.fetch('POST', '/verification/submit', { body: input });
  }

  myVerification(): Promise<VerificationStatus> {
    return this.fetch('GET', '/verification/me', {});
  }

  // ── Admin ────────────────────────────────────────────────
  adminVerificationQueue(): Promise<AdminVerificationRow[]> {
    return this.fetch('GET', '/verification/queue', {});
  }

  adminVerificationDetail(id: string): Promise<AdminVerificationDetail> {
    return this.fetch('GET', `/verification/${encodeURIComponent(id)}`, {});
  }

  adminReviewVerification(
    id: string,
    input: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
  ): Promise<unknown> {
    return this.fetch(
      'PATCH',
      `/verification/${encodeURIComponent(id)}/review`,
      {
        body: input,
      },
    );
  }

  /** Direct presigned PUT — does not go through fetch() so it bypasses bearer auth. */
  async uploadToSignedUrl(url: string, file: Blob): Promise<void> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: file,
    });
    if (!res.ok) {
      throw new ApiError(
        res.status,
        `Upload failed (${res.status})`,
        await res.text(),
      );
    }
  }

  private async fetch<T>(
    method: string,
    path: string,
    init: { body?: unknown; query?: Record<string, unknown> },
    isRetry = false,
  ): Promise<T> {
    const url = new URL(`/api${path}`, this.opts.baseUrl);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const token = this.opts.getAccessToken?.();
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    if (res.status === 401 && !isRetry && this.opts.onUnauthorized) {
      const refreshed = await this.opts.onUnauthorized();
      if (refreshed) return this.fetch(method, path, init, true);
    }

    const text = await res.text();
    const body = text ? safeJson(text) : undefined;

    if (!res.ok) {
      let message: string = `HTTP ${res.status}`;
      if (body && typeof body === 'object' && 'message' in body) {
        message = String((body as { message: unknown }).message);
      }
      throw new ApiError(res.status, message, body);
    }

    return body as T;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
