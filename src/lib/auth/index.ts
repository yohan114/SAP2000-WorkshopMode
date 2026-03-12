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
  }
}
