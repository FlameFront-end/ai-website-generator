export interface RequestUser {
  id: string;
  email: string;
  avatarUrl: string | null;
}

export interface RequestWithUser {
  user: RequestUser;
}
