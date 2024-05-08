interface Window {
  fbAsyncInit: () => void;
  FB: {
    init: (params: {
      appId: string;
      autoLogAppEvents: boolean;
      xfbml: boolean;
      version: string;
      cookie: boolean;
    }) => void;
    login: (
      callback: (response: { authResponse?: { accessToken: string } }) => void,
      options: {
        config_id: string;
        response_type: string;
        override_default_response_type: boolean;
      },
    ) => void;
  };
}
