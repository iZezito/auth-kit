import type { AuthBody } from "./model";
import { password } from "bun";
import { renderOtpEmail } from "@/emails/render";
import { sendMail } from "@/lib/mail";
import { UserPlain, type User } from "@/modules/user/model";
import { addHours, isAfter } from "date-fns";
import { BadCredentialsError } from "@/error";
import { db } from "@/lib/db";
import { twoFactorAuthentication, users } from "@/drizzle/migrations/schema";
import { eq } from "drizzle-orm";

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

    await db
      .insert(twoFactorAuthentication)
      .values({
        userId: user.id,
        code,
        expiryDate: addHours(new Date(), 2),
      })
      .onConflictDoUpdate({
        target: twoFactorAuthentication.userId,
        set: {
          code,
          expiryDate: addHours(new Date(), 2),
        },
      });

    const html = renderOtpEmail(code);
    sendMail(user.email, "Two-Factor Authentication Code", html);
  }

  static async validate2FACode(userId: string, code: string) {
    const [twoFactorAuth] = await db
      .select()
      .from(twoFactorAuthentication)
      .where(eq(twoFactorAuthentication.userId, userId));

    const isValid =
      twoFactorAuth &&
      twoFactorAuth.code === code &&
      isAfter(twoFactorAuth.expiryDate, new Date());

    if (isValid)
      db.delete(twoFactorAuthentication).where(
        eq(twoFactorAuthentication.id, twoFactorAuth.id),
      );
    return isValid;
  }
}
