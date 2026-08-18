import requests
BASE = "http://localhost:3000"
r = requests.get(f"{BASE}/api/health")
print(f"Health: {r.json()}")
