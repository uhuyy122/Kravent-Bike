import { getSessionToken } from '../session';

export const getWhatsAppVerificationToken = async (): Promise<string> => {
  return getSessionToken();
};
