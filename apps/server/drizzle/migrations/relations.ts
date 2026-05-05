import { relations } from "drizzle-orm/relations";
import {
  users,
  emailVerifications,
  passwordResetTokens,
  twoFactorAuthentication,
} from "./schema";

export const emailVerificationsRelations = relations(
  emailVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [emailVerifications.userId],
      references: [users.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ one }) => ({
  emailVerification: one(emailVerifications, {
    fields: [users.id],
    references: [emailVerifications.userId],
  }),
  passwordResetToken: one(passwordResetTokens, {
    fields: [users.id],
    references: [passwordResetTokens.userId],
  }),
  twoFactorAuthentication: one(twoFactorAuthentication, {
    fields: [users.id],
    references: [twoFactorAuthentication.userId],
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);

export const twoFactorAuthenticationRelations = relations(
  twoFactorAuthentication,
  ({ one }) => ({
    user: one(users, {
      fields: [twoFactorAuthentication.userId],
      references: [users.id],
    }),
  }),
);
