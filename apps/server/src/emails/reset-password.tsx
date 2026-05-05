import * as React from "react";
import {
  Tailwind,
  Section,
  Text,
  Button,
  Container,
  Head,
} from "@react-email/components";

export default function ResetPasswordEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <Tailwind>
      <Head />

      <Container className="bg-gray-100 px-4 py-10 w-full">
        <Section
          align="center"
          className="bg-white w-[320px] rounded-2xl px-6 py-8 shadow-md text-center"
        >
          <Text className="text-sm font-semibold text-violet-600 mb-2">
            Reset your password
          </Text>

          <Text className="text-gray-600 text-sm mb-6">
            You requested to reset your password. Click the button below to
            proceed.
          </Text>

          <Button
            href={resetUrl}
            className="bg-violet-600 text-white text-sm font-semibold px-5 py-2 rounded-lg"
          >
            Reset Password
          </Button>

          <Text className="text-gray-400 font-light text-xs mt-6">
            If you didn’t request a password reset, you can ignore this email.
          </Text>
          <Text className="text-gray-500 text-xs mt-2">
            This link will expire in 30 minutes.
          </Text>
        </Section>
      </Container>
    </Tailwind>
  );
}

ResetPasswordEmail.PreviewProps = {
  resetUrl: "https://example.com/reset-password?token=abc123",
};
