export class UserProfileResponse {
  id!: string;
  email!: string;
  avatarUrl!: string | null;
}

export class AuthTokenResponse {
  accessToken!: string;
  user!: UserProfileResponse;
}
