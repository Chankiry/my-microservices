export interface UserProfile {
  id: string;
  email: string;
  name: string;
  keycloakId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Preference {
  id: string;
  userId: string;
  language: string;
  theme: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  timezone?: string;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}
