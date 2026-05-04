import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPayload } from './entities/token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: [{ phone: registerDto.phone }, { email: registerDto.email }],
    });

    if (existingUser) {
      if (existingUser.phone === registerDto.phone) {
        throw new ConflictException('Phone number already registered');
      }
      if (existingUser.email === registerDto.email) {
        throw new ConflictException('Email already registered');
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = this.usersRepository.create({
      phone: registerDto.phone,
      email: registerDto.email,
      passwordHash,
      fullName: registerDto.fullName,
      vehicleType: registerDto.vehicleType,
      vehiclePlate: registerDto.vehiclePlate,
      role: 'driver',
    });

    await this.usersRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Login user with phone and password
   */
  async login(loginDto: LoginDto) {
    // Find user by phone
    const user = await this.usersRepository.findOne({
      where: { phone: loginDto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Please login using OAuth');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await this.usersRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Return user without sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Login/Register with OAuth
   */
  async loginWithOAuth(provider: string, oauthId: string, profile: {
    email?: string;
    name?: string;
    picture?: string;
  }) {
    let user = await this.usersRepository.findOne({
      where: { oauthProvider: provider, oauthId },
    });

    if (user) {
      // Existing user - update last login
      user.lastLogin = new Date();
      await this.usersRepository.save(user);
    } else {
      // Check if email exists
      if (profile.email) {
        user = await this.usersRepository.findOne({
          where: { email: profile.email },
        });

        if (user) {
          // Link OAuth to existing account
          user.oauthProvider = provider;
          user.oauthId = oauthId;
          user.lastLogin = new Date();
          await this.usersRepository.save(user);
        }
      }

      // Create new user
      if (!user) {
        user = this.usersRepository.create({
          email: profile.email,
          oauthProvider: provider,
          oauthId,
          fullName: profile.name || 'User',
          role: 'driver',
          lastLogin: new Date(),
        });
        await this.usersRepository.save(user);
      }
    }

    const tokens = await this.generateTokens(user);
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
      isNewUser: !user.email || !user.phone,
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate JWT token and return user
   */
  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const { passwordHash, oauthId, oauthProvider, ...result } = user;
      return result;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          phone: user.phone,
          role: user.role,
        },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: '1h',
        }
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        }
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(phone: string) {
    const user = await this.usersRepository.findOne({
      where: { phone },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the number is registered, you will receive a reset code' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: Send SMS via Twilio
    console.log(`Password reset code for ${phone}: ${code}`);

    // Store code hash with expiry (15 minutes)
    // This would be stored in Redis for fast expiry
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // For now, just return success
    return { message: 'If the number is registered, you will receive a reset code' };
  }

  /**
   * Verify reset code and set new password
   */
  async resetPassword(phone: string, code: string, newPassword: string) {
    // TODO: Verify code from Redis
    // For now, this is a placeholder
    throw new BadRequestException('Password reset not fully implemented');
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, oauthId, oauthProvider, ...result } = user;
    return result;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: Partial<User>) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check for duplicate phone/email
    if (updateData.phone && updateData.phone !== user.phone) {
      const existing = await this.usersRepository.findOne({
        where: { phone: updateData.phone },
      });
      if (existing) {
        throw new ConflictException('Phone number already in use');
      }
    }

    if (updateData.email && updateData.email !== user.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: updateData.email },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update password if provided
    if (updateData.passwordHash) {
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(updateData.passwordHash, saltRounds);
    }

    Object.assign(user, updateData);
    await this.usersRepository.save(user);

    const { passwordHash, oauthId, oauthProvider, ...result } = user;
    return result;
  }
}
