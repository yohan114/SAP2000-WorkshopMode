export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};
