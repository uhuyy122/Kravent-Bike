import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';

export const getWhatsAppVerificationIdToken = async (): Promise<string> => {
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  return user.getIdToken();
};
