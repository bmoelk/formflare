#!/bin/bash

# FormFlare Test Script
# This script tests the FormFlare worker endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WORKER_URL="${1:-http://localhost:8787}"

echo "Testing FormFlare Worker at: $WORKER_URL"
echo "=========================================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check (GET /)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$WORKER_URL/")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Submit without Turnstile token (should fail)
echo -e "${YELLOW}Test 2: Submit without Turnstile token (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/submit" \
    -H "Content-Type: application/json" \
    -d '{
        "formId": "test-form",
        "data": {
            "name": "Test User",
            "email": "test@example.com"
        }
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✓ Correctly rejected (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Unexpected response (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Submit without form ID (should fail)
echo -e "${YELLOW}Test 3: Submit without form ID (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/submit" \
    -H "Content-Type: application/json" \
    -d '{
        "turnstileToken": "fake-token",
        "data": {
            "name": "Test User"
        }
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✓ Correctly rejected (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Unexpected response (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 4: Submit without data (should fail)
echo -e "${YELLOW}Test 4: Submit without data (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/submit" \
    -H "Content-Type: application/json" \
    -d '{
        "formId": "test-form",
        "turnstileToken": "fake-token"
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✓ Correctly rejected (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Unexpected response (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 5: Submit with fake Turnstile token (should fail verification)
echo -e "${YELLOW}Test 5: Submit with fake Turnstile token (should fail verification)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/submit" \
    -H "Content-Type: application/json" \
    -d '{
        "formId": "test-form",
        "turnstileToken": "fake-token-12345",
        "data": {
            "name": "Test User",
            "email": "test@example.com",
            "message": "This is a test message"
        }
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 403 ]; then
    echo -e "${GREEN}✓ Correctly rejected by Turnstile (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${YELLOW}⚠ Unexpected response (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    echo "Note: This might fail if Turnstile secret is not configured"
fi
echo ""

# Test 6: Get submissions without auth (should fail)
echo -e "${YELLOW}Test 6: Get submissions without auth (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$WORKER_URL/submissions/test-form")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ Correctly rejected (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Unexpected response (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 7: CORS preflight
echo -e "${YELLOW}Test 7: CORS preflight (OPTIONS)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS "$WORKER_URL/submit" \
    -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: POST")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 204 ]; then
    echo -e "${GREEN}✓ CORS preflight passed (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ CORS preflight failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${YELLOW}Test Summary${NC}"
echo "=========================================="
echo "All basic validation tests completed."
echo ""
echo "Note: To fully test Turnstile integration, you need to:"
echo "1. Configure TURNSTILE_SECRET_KEY in .dev.vars"
echo "2. Use a real Turnstile token from the widget"
echo "3. Test with the example.html file"
echo ""
echo "To test with authentication:"
echo "1. Set up an API key: wrangler secret put API_KEY"
echo "2. Use: curl -H 'Authorization: Bearer YOUR_KEY' $WORKER_URL/submissions/test-form"
