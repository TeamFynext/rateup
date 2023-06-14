import Session from 'supertokens-node/recipe/session'

export  async function getSessionWithRefreshHandling(context) {
    try {
      return await Session.getSession(context.req, context.res, {
        overrideGlobalClaimValidators: () => {
          return [];
        },
      });
    } catch (err) {
      if (err.type === Session.Error.TRY_REFRESH_TOKEN || err.type === Session.Error.UNAUTHORISED) {
        return { props: { fromSupertokens: 'needs-refresh' } };
      }
      throw err;
    }
  }
  