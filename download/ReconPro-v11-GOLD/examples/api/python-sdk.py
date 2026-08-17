#!/usr/bin/env python3
"""ReconPro v11.0.0 — Python SDK Example"""
import requests

BASE = "http://localhost:3000"

# Health
r = requests.get(f"{BASE}/api/health")
print(f"Health: {r.json()}")

# Login
r = requests.post(f"{BASE}/api/auth/login", json={
    "email": "admin@reconpro.local", "password": "admin"
})
token = r.json().get("token", "")
headers = {"Authorization": f"Bearer {token}"}

# List scans
r = requests.get(f"{BASE}/api/scans", headers=headers)
print(f"Scans: {r.json()}")

# Compliance
r = requests.get(f"{BASE}/api/compliance", headers=headers)
print(f"Compliance: {r.json()}")
