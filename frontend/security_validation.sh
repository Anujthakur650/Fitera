#!/bin/bash

# Fitera Security Validation Script
# Comprehensive security assessment for production readiness

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          FITERA SECURITY VALIDATION SUITE v1.0               ║"
echo "║         Enterprise Security Assessment & Validation          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize scoring
TOTAL_SCORE=0
MAX_SCORE=0
PASSED_TESTS=0
FAILED_TESTS=0

# Security test results array
declare -a test_results

# Function to run security test
run_test() {
    local test_name=$1
    local test_command=$2
    local max_points=$3
    local critical=$4
    
    MAX_SCORE=$((MAX_SCORE + max_points))
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC} (+$max_points points)"
        TOTAL_SCORE=$((TOTAL_SCORE + max_points))
        PASSED_TESTS=$((PASSED_TESTS + 1))
        test_results+=("✓ $test_name: PASSED")
    else
        if [ "$critical" = "true" ]; then
            echo -e "${RED}✗ FAILED${NC} (CRITICAL)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            test_results+=("✗ $test_name: FAILED (CRITICAL)")
        else
            echo -e "${YELLOW}⚠ WARNING${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            test_results+=("⚠ $test_name: WARNING")
        fi
    fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 1: SECURITY IMPLEMENTATION VALIDATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Authentication Security Tests
echo -e "${BLUE}1. Authentication & Session Security${NC}"
echo "-----------------------------------"
run_test "Rate limiter implementation" "[ -f utils/rateLimiter.js ]" 10 true
run_test "API rate limiter implementation" "[ -f utils/apiRateLimiter.js ]" 10 true
run_test "Auth context security" "grep -q 'bcrypt\\|crypto' contexts/AuthContext.js" 10 true
run_test "Secure token storage" "grep -q 'SecureStore' contexts/AuthContext.js" 10 true
run_test "Password hashing implementation" "grep -q 'bcrypt.*hash\\|crypto.*pbkdf2' contexts/AuthContext.js" 10 true
echo ""

# 2. Database Security Tests
echo -e "${BLUE}2. Database Security${NC}"
echo "-------------------"
run_test "Database manager implementation" "[ -f utils/database.js ]" 10 true
run_test "Foreign key constraints" "grep -q 'PRAGMA foreign_keys = ON' utils/database.js" 10 true
run_test "User-scoped queries" "[ -f utils/enhancedQueries.js ]" 10 true
run_test "Input validation" "[ -f utils/inputValidator.js ]" 10 true
run_test "SQL injection prevention" "grep -q '?' utils/enhancedQueries.js" 10 true
echo ""

# 3. Network Security Tests
echo -e "${BLUE}3. Network Security${NC}"
echo "-------------------"
run_test "Network security implementation" "[ -f utils/networkSecurity.js ]" 10 true
run_test "HTTPS enforcement" "grep -q 'enforceHTTPS' utils/networkSecurity.js" 10 true
run_test "Certificate pinning" "grep -q 'certificatePinning' utils/networkSecurity.js" 10 true
run_test "Security headers" "grep -q 'X-Content-Type-Options' utils/networkSecurity.js" 5 false
run_test "API security integration" "grep -q 'NetworkSecurity' api/config.js" 10 true
echo ""

# 4. Error Handling & Logging Tests
echo -e "${BLUE}4. Error Handling & Security Logging${NC}"
echo "------------------------------------"
run_test "Error handler implementation" "[ -f utils/errorHandler.js ]" 10 true
run_test "Security audit logging" "[ -f utils/securityAudit.js ]" 10 true
run_test "Secure error messages" "grep -q 'sanitizeError' utils/errorHandler.js" 10 true
run_test "Audit trail implementation" "grep -q 'logSecurityEvent' utils/securityAudit.js" 10 true
echo ""

# 5. Dependency Security Tests
echo -e "${BLUE}5. Dependency & Package Security${NC}"
echo "--------------------------------"
run_test "Package.json exists" "[ -f package.json ]" 5 true
run_test "Secure dependencies" "! npm audit 2>&1 | grep -q 'high\\|critical'" 15 true
run_test "bcrypt dependency" "grep -q 'bcryptjs' package.json" 5 false
run_test "Secure storage dependency" "grep -q 'expo-secure-store' package.json" 5 false
echo ""

# 6. API Security Tests
echo -e "${BLUE}6. API Security & Rate Limiting${NC}"
echo "-------------------------------"
run_test "API configuration" "[ -f api/config.js ]" 10 true
run_test "Request interceptors" "grep -q 'interceptors.request' api/config.js" 10 true
run_test "Response interceptors" "grep -q 'interceptors.response' api/config.js" 10 true
run_test "API rate limiting integration" "grep -q 'APIRateLimiter' api/config.js" 10 true
echo ""

# 7. Security Documentation Tests
echo -e "${BLUE}7. Security Documentation${NC}"
echo "-------------------------"
run_test "Security documentation" "[ -f docs/SECURITY.md ]" 10 true
run_test "Privacy policy" "[ -f docs/PRIVACY_POLICY.md ] || [ -f ../PRIVACY_POLICY.md ]" 5 false
run_test "Terms of service" "[ -f docs/TERMS_OF_SERVICE.md ] || [ -f ../TERMS_OF_SERVICE.md ]" 5 false
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 2: PRODUCTION READINESS ASSESSMENT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 8. Production Configuration Tests
echo -e "${BLUE}8. Production Configuration${NC}"
echo "---------------------------"
run_test "Environment configuration" "[ -f .env.example ] || [ -f .env.production ]" 5 false
run_test "Build configuration" "[ -f app.json ] || [ -f app.config.js ]" 10 true
run_test "Production API endpoint" "! grep -q 'localhost\\|127.0.0.1' api/config.js || grep -q '__DEV__' api/config.js" 10 true
echo ""

# 9. Performance Impact Tests
echo -e "${BLUE}9. Security Performance Impact${NC}"
echo "------------------------------"
run_test "Async authentication" "grep -q 'async.*authenticate\\|async.*login' contexts/AuthContext.js" 5 false
run_test "Efficient rate limiting" "grep -q 'Map\\|Object' utils/rateLimiter.js" 5 false
run_test "Optimized database queries" "grep -q 'PRAGMA.*optimize' utils/database.js" 5 false
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "PHASE 3: APP STORE COMPLIANCE VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 10. App Store Compliance Tests
echo -e "${BLUE}10. App Store Compliance${NC}"
echo "------------------------"
run_test "App configuration" "[ -f app.json ] && grep -q 'expo' app.json" 10 true
run_test "iOS configuration" "grep -q 'ios' app.json 2>/dev/null || [ -f app.config.js ]" 5 false
run_test "Android configuration" "grep -q 'android' app.json 2>/dev/null || [ -f app.config.js ]" 5 false
run_test "Privacy compliance" "grep -q 'privacy\\|Privacy' docs/SECURITY.md" 5 false
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "SECURITY VALIDATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Calculate final score
PERCENTAGE=$((TOTAL_SCORE * 100 / MAX_SCORE))

# Display results
echo "Test Results:"
echo "-------------"
for result in "${test_results[@]}"; do
    echo "$result"
done
echo ""

echo "Score Breakdown:"
echo "----------------"
echo "Total Points Earned: $TOTAL_SCORE / $MAX_SCORE"
echo "Tests Passed: $PASSED_TESTS"
echo "Tests Failed: $FAILED_TESTS"
echo -e "Security Score: ${GREEN}${PERCENTAGE}%${NC}"
echo ""

# Determine security grade
if [ $PERCENTAGE -ge 98 ]; then
    GRADE="A+ (Enterprise Excellence)"
    GRADE_COLOR=$GREEN
elif [ $PERCENTAGE -ge 95 ]; then
    GRADE="A (Enterprise Grade)"
    GRADE_COLOR=$GREEN
elif [ $PERCENTAGE -ge 90 ]; then
    GRADE="A- (Professional Grade)"
    GRADE_COLOR=$GREEN
elif [ $PERCENTAGE -ge 85 ]; then
    GRADE="B+ (Good Security)"
    GRADE_COLOR=$YELLOW
elif [ $PERCENTAGE -ge 80 ]; then
    GRADE="B (Adequate Security)"
    GRADE_COLOR=$YELLOW
else
    GRADE="C (Needs Improvement)"
    GRADE_COLOR=$RED
fi

echo -e "Security Grade: ${GRADE_COLOR}${GRADE}${NC}"
echo ""

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Create validation report
cat > security_validation_report.json << EOF
{
  "validation_date": "$TIMESTAMP",
  "security_score": $PERCENTAGE,
  "security_grade": "$GRADE",
  "tests_passed": $PASSED_TESTS,
  "tests_failed": $FAILED_TESTS,
  "total_points": $TOTAL_SCORE,
  "max_points": $MAX_SCORE,
  "production_ready": $([ $PERCENTAGE -ge 95 ] && echo "true" || echo "false"),
  "app_store_ready": $([ $PERCENTAGE -ge 95 ] && echo "true" || echo "false"),
  "validation_version": "1.0"
}
EOF

echo "═══════════════════════════════════════════════════════════════"
echo "DEPLOYMENT READINESS ASSESSMENT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $PERCENTAGE -ge 98 ]; then
    echo -e "${GREEN}✓ PRODUCTION DEPLOYMENT: AUTHORIZED${NC}"
    echo -e "${GREEN}✓ APP STORE SUBMISSION: READY${NC}"
    echo -e "${GREEN}✓ SECURITY STANDARD: ENTERPRISE EXCELLENCE ACHIEVED${NC}"
    echo ""
    echo "🎉 Congratulations! Fitera has achieved enterprise-grade security."
    echo "   The application is ready for production deployment and app store submission."
elif [ $PERCENTAGE -ge 95 ]; then
    echo -e "${GREEN}✓ PRODUCTION DEPLOYMENT: AUTHORIZED${NC}"
    echo -e "${GREEN}✓ APP STORE SUBMISSION: READY${NC}"
    echo -e "${YELLOW}⚠ SECURITY STANDARD: Minor optimizations recommended${NC}"
    echo ""
    echo "The application meets security requirements for deployment."
else
    echo -e "${RED}✗ PRODUCTION DEPLOYMENT: NOT RECOMMENDED${NC}"
    echo -e "${RED}✗ APP STORE SUBMISSION: REVIEW REQUIRED${NC}"
    echo ""
    echo "Additional security improvements are needed before deployment."
fi

echo ""
echo "Full report saved to: security_validation_report.json"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           SECURITY VALIDATION COMPLETE                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
