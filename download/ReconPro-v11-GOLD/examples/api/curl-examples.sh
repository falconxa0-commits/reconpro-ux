#!/usr/bin/env bash
BASE=http://localhost:3000
curl -s $BASE/api/health | jq .
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@reconpro.local","password":"admin"}' | jq -r '.token')
curl -s $BASE/api/scans -H "Authorization: Bearer $TOKEN" | jq .
curl -s -X POST $BASE/api/scan -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"target":"example.com","modules":["dns","ssl"]}' | jq .
