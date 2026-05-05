import { password, randomUUIDv7 } from "bun";
import type { User, UserCreate, UserPlain, UserUpdate } from "./model";
import { addDays, addHours, isAfter } from "date-fns";
import { CustomError, NotFoundError } from "@/error";
import { db } from "@/lib/db";
import {
  users,
  emailVerifications,
  passwordResetTokens,
} from "drizzle/migrations/schema";
import { renderVerifyEmail } from "@/emails/render";
import { sendMail } from "@/lib/mail";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";

export abstract class UserService {
  static async save(user: UserCreate) {
    const bcryptHash = await password.hash(user.password, {
      algorithm: "bcrypt",
      cost: 10,
    });
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          ...user,
          emailVerified: false,
          password: bcryptHash,
        })
        .returning();

      const token = await this.createVerificationEmailToken(newUser.id);

      const html = renderVerifyEmail(
        `${Bun.env.CLIENT_URL}/validate-email?token=${token}`,
      );

      sendMail(newUser.email, "Account Verify", html);

      return newUser;
    } catch (e: any) {
      if (e.cause.errno === "23505") {
        return null;
      }
      throw e;
    }
  }

  static async updatePassword(userId: string, newPassword: string) {
    const bcryptHash = await password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    await db
      .update(users)
      .set({
        password: bcryptHash,
      })
      .where(eq(users.id, userId));
  }

  static async findById(id: string) {
    const cacheKey = `user:${id}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return this.parseCachedUser(cached);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        password: false,
      },
    });

    if (!user) throw new NotFoundError("User not found!");

    await redis.setex(cacheKey, 60 * 15, JSON.stringify(user));

    return user;
  }

  static parseCachedUser(cached: string): User {
    const user = JSON.parse(cached);

    if (user.subscription) {
      user.subscription.expiresAt = user.subscription.expiresAt
        ? new Date(user.subscription.expiresAt)
        : null;
      user.subscription.createdAt = new Date(user.subscription.createdAt);
      user.subscription.updatedAt = new Date(user.subscription.updatedAt);
      user.subscription.startedAt = new Date(user.subscription.startedAt);
    }

    return user as User;
  }

  static async update(body: UserUpdate, userId: string) {
    const [userEntity] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!userEntity) throw new NotFoundError("User not found!");

    const [user] = await db
      .update(users)
      .set({
        name: body.name,
        twoFactorAuthenticationEnabled: body.twoFactorAuthenticationEnabled,
      })
      .where(eq(users.id, userEntity.id))
      .returning();

    await this.invalidateCache(user.id);

    return user;
  }

  static async createVerificationEmailToken(userId: string) {
    const verificationToken = randomUUIDv7();

    await db.insert(emailVerifications).values({
      verificationToken,
      userId,
      expiryDate: addDays(new Date(), 1),
    });

    return verificationToken;
  }

  static async createPasswordResetToken(userId: string) {
    const token = randomUUIDv7();

    await db
      .insert(passwordResetTokens)
      .values({
        token,
        userId,
        expiryDate: addHours(new Date(), 1),
      })
      .onConflictDoUpdate({
        target: passwordResetTokens.userId,
        set: {
          token,
          expiryDate: addHours(new Date(), 1),
        },
      });

    return token;
  }

  static async findByEmail(email: string): Promise<UserPlain> {
    return await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((row) => row[0]);
  }

  static async validateEmail(token: string) {
    const [emailVerification] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.verificationToken, token));

    if (
      emailVerification !== null &&
      isAfter(emailVerification.expiryDate, new Date())
    ) {
      await db.transaction(async (tx) => {
        await tx.update(users).set({
          emailVerified: true,
        });

        await db
          .delete(emailVerifications)
          .where(eq(emailVerifications.id, emailVerification.id));

        return true;
      });
    }
    return false;
  }

  static async findByToken(token: string) {
    return await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  }

  static async invalidateCache(id: string) {
    await redis.del(`user:${id}`);
  }
}
