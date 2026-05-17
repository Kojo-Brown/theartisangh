export interface SmsMessage {
  to: string; // E.164 phone
  body: string;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export interface SmsProvider {
  send(message: SmsMessage): Promise<{ id: string }>;
}
