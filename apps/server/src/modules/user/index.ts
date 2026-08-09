import { Elysia, t } from "elysia";
import { UserService } from "./service";
import { authGuard } from "@/plugin/middleware";
import { sendMail } from "@/lib/mail";
import { renderResetPasswordEmail } from "@/emails/render";

import { paramModel } from "@/plugin/model";
import { _selectUser, createUser, selectUser, updateUser } from "./model";

export const userController = new Elysia({ prefix: "/users" })
  .use(paramModel)
  .post(
    "",
    async ({ body, status }) => {
      await UserService.save(body);
      return status(201);
    },
    {
      body: createUser,
    },
  )
  .get(
    "/email-verification",
    async ({ query: { token } }) => {
      const validated = await UserService.validateEmail(token);
      if (validated) {
        return "Email verified successfully!";
      }
      return "Invalid or expired verification token.";
    },
    {
      response: t.String(),
      query: t.Object({
        token: t.String(),
      }),
    },
  )
  .post(
    "/forgot-password",
    async ({ body: { email } }) => {
      const userEntity = await UserService.findByEmail(email);
      if (userEntity) {
        const resetToken = await UserService.createPasswordResetToken(
          userEntity.id,
        );
        const html = renderResetPasswordEmail(
          `${Bun.env.CLIENT_URL}/reset-password?token=${resetToken}`,
        );
        await sendMail(userEntity.email, "Password Reset", html);
      }
      return "If an account with that email address exists, it will receive an email with instructions for resetting its password.";
    },
    {
      response: t.String(),
      body: t.Object({
        email: t.String({
          format: "email",
        }),
      }),
    },
  )
  .put(
    "/password-reset",
    async ({ status, body: { token, newPassword } }) => {
      const userId = await UserService.consumePasswordResetToken(token);

      if (!userId) {
        return status(410, "Token invalid or expired.");
      }

      await UserService.updatePassword(userId, newPassword);

      return "Password changed successfully.";
    },
    {
      response: {
        200: t.String(),
        410: t.String(),
      },
      body: t.Object({
        newPassword: t.String({
          minLength: 6,
        }),
        token: t.String(),
      }),
    },
  )
  .use(authGuard)
  .get(
    "/:id",
    async ({ params: { id } }) => {
      return await UserService.findById(id);
    },
    {
      requireRole: "ADMIN",
      response: selectUser,
      params: "params-id",
    },
  )
  .put(
    "/:id",
    async ({ status, body, user, params: { id } }) => {
      if (id !== user.id)
        return status(403, "You do not have access to this feature");

      return await UserService.update(body, user.id);
    },
    {
      response: {
        200: selectUser,
        403: t.String(),
      },
      body: updateUser,
      params: "params-id",
    },
  )
  .get(
    "",
    async ({ user }) => {
      const userEntity = await UserService.findById(user.id);
      return userEntity;
    },
    {
      response: selectUser,
    },
  );
