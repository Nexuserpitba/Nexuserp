// WebAuthn biometric authentication helpers
// Uses the Web Authentication API for fingerprint/face recognition

const CREDENTIALS_KEY = "webauthn-credentials";

interface StoredCredential {
  credentialId: string;
  userId: string;
  userLogin: string;
}

function getStoredCredentials(): StoredCredential[] {
  try {
    const s = localStorage.getItem(CREDENTIALS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveCredential(cred: StoredCredential) {
  const all = getStoredCredentials().filter(c => c.userId !== cred.userId);
  all.push(cred);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(all));
}

function removeCredentialForUser(userId: string) {
  const all = getStoredCredentials().filter(c => c.userId !== userId);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(all));
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isBiometricAvailable(): boolean {
  return !!window.PublicKeyCredential;
}

export function hasBiometricForUser(userId: string): boolean {
  return getStoredCredentials().some(c => c.userId === userId);
}

export function hasAnyBiometric(): boolean {
  return getStoredCredentials().length > 0;
}

export async function registerBiometric(userId: string, userLogin: string, userName: string): Promise<boolean> {
  if (!isBiometricAvailable()) {
    throw new Error("Biometria não suportada neste navegador.");
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "NexusERP", id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: userLogin,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    }) as PublicKeyCredential | null;

    if (!credential) return false;

    saveCredential({
      credentialId: bufferToBase64(credential.rawId),
      userId,
      userLogin,
    });

    return true;
  } catch (err: any) {
    if (err.name === "NotAllowedError") return false;
    throw err;
  }
}

export async function authenticateWithBiometric(): Promise<string | null> {
  if (!isBiometricAvailable()) return null;

  const stored = getStoredCredentials();
  if (stored.length === 0) return null;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: stored.map(c => ({
          id: base64ToBuffer(c.credentialId),
          type: "public-key" as const,
        })),
        userVerification: "required",
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) return null;

    const matchId = bufferToBase64(assertion.rawId);
    const match = stored.find(c => c.credentialId === matchId);
    return match?.userLogin ?? null;
  } catch {
    return null;
  }
}

export function removeBiometric(userId: string) {
  removeCredentialForUser(userId);
}
