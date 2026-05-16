import { ConflictException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { RegisterDto } from '../dtos/register.dto';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import { AUTH_USER_REPOSITORY, IAuthUserRepository } from '../../domain/ports/user-repository.port';

@Injectable()
export class RegisterUseCase implements OnModuleInit {
  private dummyHash!: string;

  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly userRepo: IAuthUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hasher.hash('__timing_dummy__');
  }

  async execute(dto: RegisterDto): Promise<{ userId: string }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      await this.hasher.compare(dto.password, this.dummyHash);
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.hasher.hash(dto.password);
    const user = await this.userRepo.createUser(dto.email, passwordHash);
    return { userId: user.id };
  }
}
