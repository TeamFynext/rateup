// oxlint-disable-next-line no-unused-vars
interface Window {
  fbAsyncInit: FbAsyncInit;
  FB: {
    init: FBInit;
    login: FBLogin;
    getLoginStatus: GetLoginStatus;
  };
}

// Type for window.fbAsyncInit
type FbAsyncInit = () => void;

// Type for FB.init
interface FBInitParams {
  appId: string;
  cookie?: boolean;
  xfbml?: boolean;
  version: string;
  status?: boolean;
  frictionlessRequests?: boolean;
  autoLogAppEvents?: boolean;
}

type FBInit = (params: FBInitParams) => void;

// Type for FB.getLoginStatus
type GetLoginStatusCallback = (response: {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
  };
}) => void;

type GetLoginStatus = (callback: GetLoginStatusCallback, force?: boolean) => void;
interface FBLoginResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
    code: string;
  };
}

// Type for FB.login
type LoginCallback = (response: FBLoginResponse) => void;

interface FBLoginOptions {
  config_id: string;
  response_type: string;
  override_default_response_type: boolean;
  extras: {
    setup: any;
    featureType: string;
    sessionInfoVersion: string;
  };
  scope?: string; // e.g., 'public_profile,email'
  return_scopes?: boolean;
  enable_profile_selector?: boolean;
  profile_selector_ids?: string;
}

type FBLogin = (callback: LoginCallback, options?: FBLoginOptions) => void;
