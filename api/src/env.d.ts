export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  BASE_SHORT_URL: string;
};

export type AuthUser = { id: string; email?: string; fullName?: string; iat?: number; exp?: number };

export type AppBindings = { Bindings: Env; Variables: { user: AuthUser } };
