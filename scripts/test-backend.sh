#!/bin/bash

echo "=== Testing Backend Connectivity ==="
echo ""

BACKEND="51.20.141.199:5001"

echo "1. Testing from your Mac:"
echo "   Trying to reach http://$BACKEND/api/health..."
curl -s -o /dev/null -w "   Status: %{http_code}\n" --connect-timeout 5 "http://$BACKEND/api/health" || echo "   ✗ Cannot reach backend from Mac"

echo ""
echo "2. Testing DNS resolution:"
ping -c 2 51.20.141.199 2>&1 | grep "bytes from" | head -2

echo ""
echo "3. Is your backend running?"
echo "   Check: http://$BACKEND in your browser"
echo ""
echo "4. iPhone network check:"
echo "   - Make sure iPhone is on WiFi or has mobile data"
echo "   - Airplane mode should be OFF"
echo "   - Try opening Safari on the iPhone and visiting: http://$BACKEND"
echo ""
echo "5. Firewall check:"
echo "   - Your EC2 security group must allow inbound traffic on port 5001"
echo "   - Source: 0.0.0.0/0 (or at least your iPhone's IP)"
