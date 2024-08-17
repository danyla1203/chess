import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Put,
  Delete,
  Patch,
  Get,
} from '@nestjs/common';
import {
  UseRefreshDto,
  VerifyEmail,
  SendVerificationMail,
  GoogleCode,
} from './dto';
import { AuthGuard, AuthService } from '.';
import { LoggerService } from '../tools/logger';
import { EmailLoginDto, NameLoginDto } from './dto/Login';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private logger: LoggerService,
  ) {}

  @Post('login/email')
  emailLogin(@Body() loginData: EmailLoginDto) {
    return this.authService.login(loginData);
  }
  @Post('login/name')
  nameLogin(@Body() loginData: NameLoginDto) {
    return this.authService.login(loginData);
  }

  @Put('use-refresh')
  useRefresh(@Body() { refreshToken }: UseRefreshDto) {
    return this.authService.useRefresh(refreshToken);
  }

  @Delete('logout')
  @UseGuards(AuthGuard)
  async logout(@Request() req) {
    await this.authService.logout(req.user.id, req.user.deviceId);
    return { message: 'ok' };
  }

  @Post('send-verification-mail')
  sendVerificationMail(@Body() { email }: SendVerificationMail) {
    this.logger.log('Send verification email', 'AuthController');
    return this.authService.sendVerificationMail(email);
  }
  @Patch('verify-email')
  sendVerificationCode(@Body() { code, email }: VerifyEmail) {
    this.logger.log('Verify email by code', 'AuthController');
    return this.authService.verifyEmail(code, email);
  }

  @Get('/google/oauth/link')
  async getGoogleOauthLink() {
    return { link: await this.authService.getGoogleOauthLink() };
  }

  @Post('/google/oauth')
  googleOAuth(@Body() { code }: GoogleCode) {
    return this.authService.googleOAuth(code);
  }
}
