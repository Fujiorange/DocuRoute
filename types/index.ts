export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  companyName: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  _count: { documents: number };
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  companyId: string;
  projectId?: string;
  project?: { id: string; name: string };
  uploadedById: string;
  uploadedBy: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  companyId: string;
  invitedById: string;
  invitedBy: { id: string; name: string; email: string };
  acceptedAt?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  subdomain?: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; projects: number; documents: number };
}
