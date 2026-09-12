/** Call attempt state is separate from issue status and never establishes dispatch. */
export type DemoCallStatus = 'submitting' | 'accepted' | 'rejected' | 'uncertain';
export interface DemoCall {
  issueId: string;
  status: DemoCallStatus;
  createdAt: string;
  providerCallId: string | null;
}
export interface DemoCallInfo { configured: boolean; destination: string; call: DemoCall | null }
export const DEMO_CALL_NUMBER = '+19024739228';
export const DEMO_CALL_MESSAGES: Record<DemoCallStatus, string> = {
  submitting: 'Call attempt reserved. Delivery is not confirmed. If this remains unchanged, check Dispatcher before trying another issue.',
  accepted: 'Dispatcher accepted the call request. Answering and message delivery are not confirmed.',
  rejected: 'The call provider rejected this attempt. Check the Twilio call logs and configuration before using a new demo issue.',
  uncertain: 'The call outcome could not be confirmed. Check Dispatcher and Twilio before using a new demo issue; this attempt will not be redialed.',
};
