import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { User, Team, Prisma } from '../generated/prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Hash the password before the transaction — bcrypt is CPU-heavy and
    // holding a transaction open while hashing wastes a DB connection.
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create the team and user in a single transaction so there are no
    // orphaned teams if the user insert fails.
    // We rely on the DB unique constraint on email (P2002) rather than a
    // separate pre-check, which would be a TOCTOU race condition.
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            name: dto.teamName,
            slug: dto.teamName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
          },
        });

        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            displayName: dto.displayName,
            role: 'OWNER',
            teamId: team.id,
          },
        });

        return { user, team };
      });

      return this.generateAuthResponse(result.user, result.team.name);
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const target = e.meta?.target as string[] | undefined;
        if (target?.includes('email'))
          throw new ConflictException('Email already registered');
        if (target?.includes('slug'))
          throw new ConflictException('A team with that name already exists');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { team: true },
    });

    if (!user || !user.passwordHash || !user.team) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAuthResponse(user, user.team.name);
  }

  validateUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });
  }

  private generateAuthResponse(user: User & { team?: Team }, teamName: string) {
    // The JWT payload — this data is embedded in the token.
    // Keep it minimal (the token travels with every request).
    const payload = {
      sub: user.id, // 'sub' (subject) is the standard JWT claim for user ID
      email: user.email,
      teamId: user.teamId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        teamId: user.teamId,
        teamName,
      },
    };
  }
}
