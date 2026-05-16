import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, PaginatedUsers, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { ListUsersDto } from '../dtos/list-users.dto';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(dto: ListUsersDto): Promise<PaginatedUsers> {
    return this.userRepo.listUsers({
      page: dto.page,
      limit: dto.limit,
      role: dto.role,
      status: dto.status,
      search: dto.search,
    });
  }
}
