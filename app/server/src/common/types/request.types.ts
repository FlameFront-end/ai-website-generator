export interface RequestUser {
  id: string;
  email: string;
}

export interface RequestWithUser {
  user: RequestUser;
}
