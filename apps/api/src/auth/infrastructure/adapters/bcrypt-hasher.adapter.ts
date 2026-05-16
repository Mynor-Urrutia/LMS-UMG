import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../domain/ports/password-hasher.port';

@Injectable()
export class BcryptHasherAdapter implements IPasswordHasher {
  private readonly ROUNDS = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
