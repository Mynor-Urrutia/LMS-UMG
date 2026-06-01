import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { JwtPayload, UserRole } from '../../../common/interfaces/jwt-payload.interface';
import { RegisterDto } from '../../application/dtos/register.dto';
import { LoginDto } from '../../application/dtos/login.dto';
import { ChangePasswordDto } from '../../application/dtos/change-password.dto';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case';
import { AdminResetPasswordUseCase } from '../../application/use-cases/admin-reset-password.use-case';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';

class AdminResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

const REFRESH_COOKIE = 'refresh_token';
const AUTH_THROTTLE = { auth: { ttl: 60_000, limit: 5 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly register: RegisterUseCase,
    private readonly login: LoginUseCase,
    private readonly logout: LogoutUseCase,
    private readonly refresh: RefreshTokenUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly adminResetPassword: AdminResetPasswordUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin creates a new user' })
  async registerUser(@Body() dto: RegisterDto) {
    return this.register.execute(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('users/:userId/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin resets any user password' })
  async adminResetUserPassword(
    @Param('userId', ParseCuidPipe) userId: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    await this.adminResetPassword.execute(userId, dto.newPassword);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and obtain tokens' })
  async loginUser(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.login.execute(dto);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logoutUser(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: JwtPayload,
  ) {
    // belt-and-suspenders: global JwtAuthGuard already rejects unauthenticated requests before this runs
    if (!user) throw new UnauthorizedException();
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.logout.execute(token, user.sub);
    res.clearCookie(REFRESH_COOKIE);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    try {
      const pair = await this.refresh.execute(token);
      this.setRefreshCookie(res, pair.refreshToken, pair.refreshTokenExpiresAt);
      return { accessToken: pair.accessToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        res.clearCookie(REFRESH_COOKIE);
      }
      throw err;
    }
  }

  @Throttle(AUTH_THROTTLE)
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change authenticated user password' })
  async changeUserPassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.changePassword.execute(user.sub, dto);
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    // secure in every environment except local development — staging and production both get secure cookies
    const useSecureCookies = this.configService.get<string>('NODE_ENV') !== 'development';
    const maxAge = expiresAt.getTime() - Date.now();
    if (maxAge <= 0) throw new InternalServerErrorException('Token expiry misconfiguration');
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'strict',
      maxAge,
    });
  }
}
