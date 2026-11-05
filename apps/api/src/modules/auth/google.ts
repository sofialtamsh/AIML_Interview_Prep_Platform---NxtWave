import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/** What we trust from Google after verifying the ID token. */
export interface GoogleIdentity {
  /** Google's stable account id (OIDC `sub`). */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  /** Google Workspace domain (e.g. "nxtwave.co.in"), if any. */
  hostedDomain: string | null;
}

/** The two OIDC steps we need. A fake implementation is injected in tests. */
export interface GoogleOidcClient {
  authorizationUrl(p: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
    nonce: string;
    hostedDomain?: string;
  }): string;
  exchange(p: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    nonce: string;
  }): Promise<GoogleIdentity>;
}

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/**
 * Google Sign-In using the Authorization Code flow with PKCE (server side), with the
 * ID token verified against Google's published keys: issuer, audience, expiry and nonce.
 */
export class GoogleOidc implements GoogleOidcClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  authorizationUrl(p: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
    nonce: string;
    hostedDomain?: string;
  }) {
    const q = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: p.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: p.state,
      nonce: p.nonce,
      code_challenge: p.codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    // `hd` only pre-filters Google's account chooser; the server re-checks the domain.
    if (p.hostedDomain) q.set('hd', p.hostedDomain);
    return `${AUTH_ENDPOINT}?${q}`;
  }

  async exchange(p: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    nonce: string;
  }): Promise<GoogleIdentity> {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: p.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: p.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: p.codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
    const body = (await res.json()) as { id_token?: string };
    if (!body.id_token) throw new Error('Google returned no ID token');

    const { payload } = await jwtVerify(body.id_token, JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: this.clientId,
    });
    if (payload.nonce !== p.nonce) throw new Error('ID token nonce mismatch');
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new Error('ID token is missing sub or email');
    }
    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
      hostedDomain: typeof payload.hd === 'string' ? payload.hd : null,
    };
  }
}

export function pkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}
