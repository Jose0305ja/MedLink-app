import { File, Paths } from 'expo-file-system';

const authFile = new File(Paths.document, 'auth.json');

export type AuthPayload = Record<string, unknown>;

export async function saveAuth(payload: AuthPayload) {
  if (!authFile.exists) {
    authFile.create({ intermediates: true, overwrite: true });
  }

  authFile.write(JSON.stringify(payload));
}

export async function clearAuth() {
  if (authFile.exists) {
    authFile.delete();
  }
}

export async function getAuth() {
  try {
    if (!authFile.exists) {
      return null;
    }

    const content = await authFile.text();
    return JSON.parse(content) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getAuthToken() {
  const auth = await getAuth();

  if (!auth) {
    return null;
  }

  const token = auth.token ?? auth.accessToken ?? auth.access_token;
  return token ? String(token) : null;
}
