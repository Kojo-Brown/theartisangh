export const QUEUES = {
  smsSend: 'sms.send',
  kycVerify: 'kyc.verify',
  voiceTranscribe: 'voice.transcribe',
  paymentReconcile: 'payment.reconcile',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export interface SmsSendJob {
  to: string;
  body: string;
}
