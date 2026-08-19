import type { AuthBody } from "./model";
import { password } from "bun";
import { renderOtpEmail } from "@server/emails/render";
import { sendMail } from "@server/lib/mail";
import type { UserPlain } from "@server/modules/user/model";
import { BadCredentialsError } from "@server/error";
import { db } from "@server/lib/db";
import { users } from "@server/drizzle/migrations/schema";
import { eq } from "drizzle-orm";
import { redis, redisKeys, redisTtl } from "@server/lib/redis";

export abstract class AuthService {
  static async login(body: AuthBody) {
    const userEntity = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!userEntity) throw new BadCredentialsError();

    const verifySenha = await password.verify(
      body.password,
      userEntity.password,
    );

    if (!verifySenha) {
      throw new BadCredentialsError();
    }

    return userEntity;
  }

  static async send2FACode(user: UserPlain) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.setex(redisKeys.twoFactor(user.id), redisTtl.twoFactor, code);

    const html = renderOtpEmail(code);
    await sendMail(user.email, "Two-Factor Authentication Code", html);
  }

  static async validate2FACode(userId: string, code: string) {
    const result = await redis.eval(
      `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        end
        return 0
      `,
      1,
      redisKeys.twoFactor(userId),
      code,
    );

    return result === 1;
  }
}
