import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from './password';
import { db } from '@/lib/db';
import { AuditHelpers } from '@/lib/audit';

// Note: Type declarations are in src/lib/auth/index.ts

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'WCP Login',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'email@wcp.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await db.user.findUnique({
            where: { email: credentials.email },
            include: {
              roles: {
                include: {
                  role: {
                    include: {
                      privileges: {
                        include: {
                          privilege: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          // Check if user exists and is active
          if (!user || !user.isActive || !user.passwordHash) {
            return null;
          }

          // Check account lockout
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const lockMinutes = Math.ceil(
              (user.lockedUntil.getTime() - Date.now()) / 60000
            );
            throw new Error(
              `Account temporarily locked. Try again in ${lockMinutes} minute${lockMinutes > 1 ? 's' : ''}.`
            );
          }

          const isValid = await verifyPassword(credentials.password, user.passwordHash);

          if (!isValid) {
            // Increment failed login attempts
            const attempts = (user.failedLoginAttempts || 0) + 1;
            const lockoutDuration = Math.min(15, Math.pow(2, attempts - 3)); // 15 min max, starts at 5 attempts

            const updateData: any = {
              failedLoginAttempts: attempts,
            };

            if (attempts >= 5) {
              // Lock the account
              updateData.lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);

              // Audit log the lockout
              await AuditHelpers.logLoginFailed(
                user.email,
                'unknown',
                `${attempts} failed attempts`
              );
            }

            await db.user.update({
              where: { id: user.id },
              data: updateData,
            }).catch(() => {});

            return null;
          }

          // Successful login - reset lockout counters
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
            },
          }).catch(() => {});

          // Transform roles and privileges
          const roles = user.roles
            .filter(ur => ur.isActive)
            .map((ur) => ({
              code: ur.role.code,
              name: ur.role.name,
              level: ur.role.level,
            }));

          const privileges = user.roles
            .filter(ur => ur.isActive)
            .flatMap((ur) =>
              ur.role.privileges.filter((p) => p.isGranted).map((p) => p.privilege.code)
            );

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            employeeId: user.employeeId,
            department: user.department,
            roles,
            privileges,
            mustChangePassword: user.mustChangePassword || false,
          };
        } catch (error) {
          // Rethrow lockout error to show to user
          if (error instanceof Error && error.message.includes('locked')) {
            throw error;
          }
          console.error('[Auth] Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours (reduced from 24 for security)
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.employeeId = user.employeeId;
        token.department = user.department;
        token.roles = user.roles;
        token.privileges = user.privileges;
        token.mustChangePassword = user.mustChangePassword;
      }

      // Handle session update
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          employeeId: token.employeeId as string | null | undefined,
          department: token.department as string | null | undefined,
          roles: token.roles as Array<{ code: string; name: string; level: number }>,
          privileges: token.privileges as string[],
          mustChangePassword: token.mustChangePassword as boolean,
        };
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`[Auth] User signed in: ${user.email}`);
    },
    async signOut({ token }) {
      console.log(`[Auth] User signed out: ${token?.email}`);
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};
