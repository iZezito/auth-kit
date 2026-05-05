import * as React from "react";
import { Tailwind, Section, Text, Container } from "@react-email/components";

export default function OTPEmail({ otp }: { otp: string }) {
  return (
    <Tailwind>
      <Container className="bg-gray-100 px-4 py-10 w-full">
        <Section
          align="center"
          className="bg-white w-[320px] rounded-2xl px-6 py-8 shadow-md text-center"
        >
          <Text className="text-xs font-medium text-violet-500 mb-2">
            Two-Factor Authentication
          </Text>

          <Text className="text-gray-500 text-sm mb-4">
            Use the following code to complete your login:
          </Text>

          <Text className="text-5xl font-bold tracking-widest text-black pt-2 pb-4">
            {otp}
          </Text>

          <Text className="text-gray-400 font-light text-xs">
            This code is valid for 10 minutes.
          </Text>

          <Text className="text-gray-500 text-xs mt-2">
            If you didn’t request this, you can ignore this email.
          </Text>
        </Section>
      </Container>
    </Tailwind>
  );
}

OTPEmail.PreviewProps = {
  otp: 654321,
};
