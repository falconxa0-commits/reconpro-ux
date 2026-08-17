#!/usr/bin/env bash
BASE="http://localhost:3000"

# Health check
curl -s "$BASE/api/health" | jq .

# Login
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reconpro.local","password":"admin"}' | jq -r '.token')

# List scans
curl -s "$BASE/api/scans" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Start scan
curl -s -X POST "$BASE/api/scan" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target":"example.com","modules":["dns","ssl","http"]}' | jq .

# Compliance
curl -s "$BASE/api/compliance" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Threats
curl -s "$BASE/api/threats" \
  -H "Authorization: Bearer $TOKEN" | jq .
