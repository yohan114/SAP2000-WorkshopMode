// Re-export everything from session.ts
export * from './session';

// Re-export authOptions for API routes
export { authOptions } from './options';

// Type declarations for next-auth
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      employeeId?: string | null;
      department?: string | null;
      roles: Array<{ code: string; name: string; level: number }>;
      privileges: string[];
      mustChangePassword?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    employeeId?: string | null;
    department?: string | null;
    roles: Array<{ code: string; name: string; level: number }>;
    privileges: string[];
    mustChangePassword?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    employeeId?: string | null;
    department?: string | null;
    roles: Array<{ code: string; name: string; level: number }>;
    privileges: string[];
    mustChangePassword?: boolean;
  }
}
