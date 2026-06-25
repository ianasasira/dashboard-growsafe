export type Role = 'superadmin' | 'company_admin' | 'company_staff' | 'retailer';

export interface RequestUser {
  sub: string;
  email: string;
  role: Role;
  companyId: string | null;
  companySlug?: string | null;
}

export interface AuthedRequest extends Request {
  user: RequestUser;
  ip: string;
}
