#!/bin/bash
set -e

echo "Run integration test"

docker-compose -f ./test/docker-compose-db.yml up -d
dotenv -e ./test/.env -- npx prisma db push --force-reset
dotenv -e ./test/.env -- npx prisma db seed -- --env test
dotenv -e ./test/.env -- node --experimental-vm-modules node_modules/.bin/jest -c ./test/jest-coverage.json --verbose ---coverage --detectOpenHandles || true
docker-compose -f ./test/docker-compose-db.yml down