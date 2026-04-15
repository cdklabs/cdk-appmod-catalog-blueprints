import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

export interface AppConfig {
  apiEndpoint: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
}

let userPool: CognitoUserPool | null = null;

export function initAuth(config: AppConfig) {
  userPool = new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.userPoolClientId,
  });
}

export function signUp(
  email: string,
  password: string
): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    if (!userPool) return reject(new Error("Auth not initialized"));
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    userPool.signUp(email, password, attributes, [], (err, result) => {
      if (err) return reject(err);
      resolve(result!.user);
    });
  });
}

export function confirmSignUp(
  email: string,
  code: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!userPool) return reject(new Error("Auth not initialized"));
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function signIn(
  email: string,
  password: string
): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    if (!userPool) return reject(new Error("Auth not initialized"));
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    user.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
      newPasswordRequired: (userAttributes) => {
        // Remove non-mutable attributes returned by Cognito
        delete userAttributes.email_verified;
        delete userAttributes.email;
        user.completeNewPasswordChallenge(password, userAttributes, {
          onSuccess: (session) => resolve(session),
          onFailure: (err) => reject(err),
        });
      },
    });
  });
}

export function signOut(): void {
  if (!userPool) return;
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

export function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!userPool) return resolve(null);
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) return resolve(null);
        resolve(session.getIdToken().getJwtToken());
      }
    );
  });
}

export function getAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!userPool) return resolve(null);
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) return resolve(null);
        resolve(session.getAccessToken().getJwtToken());
      }
    );
  });
}

export function getCurrentUser(): CognitoUser | null {
  return userPool?.getCurrentUser() ?? null;
}
