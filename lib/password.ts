import bcrypt from "bcryptjs";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // limite de bcrypt
const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || password.length > PASSWORD_MAX_LENGTH) return false;
  return bcrypt.compare(password, hash);
}

/** Hash factice : garde un temps de réponse constant quand le compte n'existe pas. */
const DUMMY_HASH = "$2b$12$lVMaqXb9kS6dXpECSEtRC.BaLfAbKEUngkroqGCtl66rOVJpSACM2";
export async function verifyAgainstDummy(password: string): Promise<void> {
  await bcrypt.compare(password.slice(0, PASSWORD_MAX_LENGTH), DUMMY_HASH);
}
