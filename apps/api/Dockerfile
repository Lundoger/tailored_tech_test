# Build context is the repository root, not this directory — the API depends on
# two workspace packages, and pnpm needs the lockfile and workspace manifest to
# resolve them.
#
#   docker build -f apps/api/Dockerfile -t data-room-api .
FROM node:22-slim

# Prisma links against OpenSSL, which the slim image does not ship.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.5.3 --activate

WORKDIR /app

COPY . .

# `shared` and `db` first: the API compiles against their build output, and the
# Prisma client has to be generated before `nest build` can typecheck it.
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @data-room/shared run build \
  && pnpm --filter @data-room/db run build \
  && pnpm --filter @data-room/api run build

# Dev dependencies are kept on purpose: the Prisma CLI lives there and the deploy
# runs `prisma migrate deploy` as a release step against this same image.
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
