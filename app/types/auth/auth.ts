export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string; // Optional if you only use it on the frontend form schema
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  token?: string;
}