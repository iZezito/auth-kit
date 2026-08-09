import { password, randomUUIDv7 } from "bun";
import type { User, UserCreate, UserPlain, UserUpdate } from "./model";
import { NotFoundError } from "@/error";
import { db } from "@/lib/db";
import { users } from "@/drizzle/migrations/schema";
import { renderVerifyEmail } from "@/emails/render";
import { sendMail } from "@/lib/mail";
import { eq } from "drizzle-orm";
import { redis, redisKeys, redisTtl } from "@/lib/redis";

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

      await sendMail(newUser.email, "Account Verify", html);

      return newUser;
    } catch (e: any) {
      if (e?.cause?.errno === "23505") {
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

    await this.invalidateCache(userId);
  }

  static async findById(id: string) {
    const cacheKey = redisKeys.user(id);

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

    await redis.setex(cacheKey, redisTtl.userCache, JSON.stringify(user));

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

    const { password, ...publicUser } = user;
    return publicUser;
  }

  static async createVerificationEmailToken(userId: string) {
    const verificationToken = randomUUIDv7();

    await redis.setex(
      redisKeys.emailVerification(verificationToken),
      redisTtl.emailVerification,
      userId,
    );

    return verificationToken;
  }

  static async createPasswordResetToken(userId: string) {
    const token = randomUUIDv7();

    const userTokenKey = redisKeys.passwordResetByUser(userId);
    const previousToken = await redis.get(userTokenKey);
    const transaction = redis.multi();

    if (previousToken) {
      transaction.del(redisKeys.passwordReset(previousToken));
    }

    transaction.setex(
      redisKeys.passwordReset(token),
      redisTtl.passwordReset,
      userId,
    );
    transaction.setex(userTokenKey, redisTtl.passwordReset, token);
    await transaction.exec();

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
    const userId = await redis.getdel(redisKeys.emailVerification(token));

    if (!userId) return false;

    const [verifiedUser] = await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!verifiedUser) return false;

    await this.invalidateCache(verifiedUser.id);
    return true;
  }

  static async consumePasswordResetToken(token: string) {
    const userId = await redis.getdel(redisKeys.passwordReset(token));

    if (!userId) return null;

    const userTokenKey = redisKeys.passwordResetByUser(userId);
    const activeToken = await redis.get(userTokenKey);

    if (activeToken !== token) return null;

    await redis.del(userTokenKey);
    return userId;
  }

  static async invalidateCache(id: string) {
    await redis.del(redisKeys.user(id));
  }
}
