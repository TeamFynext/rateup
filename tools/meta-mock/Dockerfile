# The mock is dependency-free, so this is a copy and a CMD.
FROM node:24-alpine

WORKDIR /app
COPY package.json index.mjs index.d.ts graph-fixtures.json ./
COPY src ./src
COPY bin ./bin

ENV META_MOCK_HOST=0.0.0.0
ENV META_MOCK_PORT=3099
EXPOSE 3099

# Webhooks are delivered back out of the container, so the target has to be
# reachable from inside it — host.docker.internal on Docker Desktop, or the
# service name when the app runs in the same compose network.
ENV META_MOCK_WEBHOOK_URL=http://host.docker.internal:3001/api/wa/webhook

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3099/__stub/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "bin/meta-mock.mjs"]
