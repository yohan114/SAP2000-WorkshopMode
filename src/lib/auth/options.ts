import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';

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

          if (!user || !user.isActive || !user.passwordHash) {
            return null;
          }

          const isValid = await compare(credentials.password, user.passwordHash);

          if (!isValid) {
            return null;
          }

          // Update last login
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }).catch(() => {}); // Ignore update errors

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
          };
        } catch (error) {
          console.error('[Auth] Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
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
        secure: false, // Set to true in production with HTTPS
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
  debug: false, // Disable debug to reduce noise
  secret: process.env.NEXTAUTH_SECRET || 'wcp-secret-key-change-in-production',
};
