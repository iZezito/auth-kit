import * as React from "react";
import {
  Tailwind,
  Section,
  Text,
  Button,
  Container,
} from "@react-email/components";

export default function VerifyEmail({
  verificationUrl,
}: {
  verificationUrl: string;
}) {
  return (
    <Tailwind>
      <Container className="bg-gray-100 px-4 py-10 w-full">
        <Section
          align="center"
          className="bg-white w-[320px] rounded-2xl px-6 py-8 shadow-md text-center"
        >
          <Text className="text-sm font-semibold text-violet-600 mb-2">
            Confirm your email address
          </Text>

          <Text className="text-gray-600 text-sm mb-6">
            Please confirm your email address by clicking the button below.
          </Text>

          <Button
            href={verificationUrl}
            className="bg-violet-600 text-white text-sm font-semibold px-5 py-2 rounded-lg"
          >
            Verify Email
          </Button>

          <Text className="text-gray-400 font-light text-xs mt-6">
            If you didn’t create an account, you can safely ignore this email.
          </Text>
          <Text className="text-gray-500 text-xs mt-2">
            Thank you for joining us!
          </Text>
        </Section>
      </Container>
    </Tailwind>
  );
}

VerifyEmail.PreviewProps = {
  verificationUrl: "https://example.com/verify?token=abc123",
};
