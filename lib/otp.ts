import { randomInt } from "crypto";
import { hashPasscode, verifyPasscode } from "./passcode";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;

export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export const hashOtpCode = hashPasscode;
export const verifyOtpCode = verifyPasscode;
