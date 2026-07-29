# The mock is dependency-free, so this is a copy and a CMD.
FROM node:24-alpine

WORKDIR /app
COPY package.json index.mjs index.d.ts graph-fixtures.json ./
COPY src ./src
COPY bin ./bin

# `::` rather than 0.0.0.0: it is dual-stack, so it answers on IPv4 too, and
# IPv6 is the only way in on networks like Railway's private one, where
# 0.0.0.0 binds successfully and then refuses every connection.
ENV META_MOCK_HOST=::
ENV PORT=8081
EXPOSE 8081

# message-dispatcher's setup expects sent → delivered → read; without this a
# send is answered and nothing follows, so statuses never update and the
# silence reads as a bug in the app under test rather than a missing flag.
ENV META_MOCK_STATUS_PROGRESSION=1

# Webhooks are delivered back out of the container, so the target has to be
# reachable from inside it — host.docker.internal on Docker Desktop, the service
# name on a shared compose network, or <service>.railway.internal on Railway.
# This default only suits local Docker Desktop; override it anywhere else.
ENV META_MOCK_WEBHOOK_URL=http://host.docker.internal:3001/api/wa/webhook

# Follows PORT rather than hardcoding it, so overriding the port does not leave
# the probe knocking on the old one and the container stuck unhealthy.
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8081)+'/__stub/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "bin/meta-mock.mjs"]
