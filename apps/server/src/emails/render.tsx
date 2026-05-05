import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import VerifyEmail from "./verify-email";
import OTPEmail from "./otp";
import ResetPasswordEmail from "./reset-password";

export function renderVerifyEmail(verificationUrl: string): string {
  return renderToStaticMarkup(
    <VerifyEmail verificationUrl={verificationUrl} />
  );
}

export function renderOtpEmail(optCode: string) {
  return renderToStaticMarkup(<OTPEmail otp={optCode} />);
}

export function renderResetPasswordEmail(resetUrl: string) {
  return renderToStaticMarkup(<ResetPasswordEmail resetUrl={resetUrl} />);
}
