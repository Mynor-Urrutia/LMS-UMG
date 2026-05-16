export const PASSWORD_HASHER = 'PASSWORD_HASHER';

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}
