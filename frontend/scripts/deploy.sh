#!/bin/bash

# Fitera App Deployment Helper Script
# This script helps automate common deployment tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main menu
show_menu() {
    echo ""
    echo "====================================="
    echo "   Fitera App Deployment Helper"
    echo "====================================="
    echo "1. Check deployment readiness"
    echo "2. Setup EAS Build"
    echo "3. Build for iOS"
    echo "4. Build for Android"
    echo "5. Build for both platforms"
    echo "6. Submit to App Store"
    echo "7. Submit to Play Store"
    echo "8. Run pre-deployment checks"
    echo "9. Clean build cache"
    echo "0. Exit"
    echo ""
    read -p "Select an option: " choice
}

# Check deployment readiness
check_readiness() {
    print_status "Checking deployment readiness..."
    
    # Check for required files
    print_status "Checking required files..."
    
    files_to_check=(
        "app.json"
        "package.json"
        "eas.json"
        ".env.production"
        "assets/icon.png"
        "assets/splash.png"
        "assets/adaptive-icon.png"
    )
    
    all_files_exist=true
    for file in "${files_to_check[@]}"; do
        if [ -f "$file" ]; then
            print_success "$file exists"
        else
            print_error "$file is missing"
            all_files_exist=false
        fi
    done
    
    # Check for EAS CLI
    if command_exists eas; then
        print_success "EAS CLI is installed"
    else
        print_error "EAS CLI is not installed. Run: npm install -g eas-cli"
    fi
    
    # Check for Firebase config files
    print_status "Checking Firebase configuration..."
    if [ -f "google-services.json" ] || [ -f "android/app/google-services.json" ]; then
        print_success "Android Firebase config found"
    else
        print_warning "google-services.json not found"
    fi
    
    if [ -f "GoogleService-Info.plist" ] || [ -f "ios/GoogleService-Info.plist" ]; then
        print_success "iOS Firebase config found"
    else
        print_warning "GoogleService-Info.plist not found"
    fi
    
    # Check EAS configuration
    if grep -q "your-eas-project-id" app.json; then
        print_warning "EAS project ID needs to be updated in app.json"
    else
        print_success "EAS project ID is configured"
    fi
    
    if $all_files_exist; then
        print_success "Basic file check passed!"
    else
        print_error "Some required files are missing"
    fi
}

# Setup EAS Build
setup_eas() {
    print_status "Setting up EAS Build..."
    
    # Check if logged in
    if ! eas whoami >/dev/null 2>&1; then
        print_warning "Not logged in to EAS. Please log in:"
        eas login
    else
        print_success "Already logged in to EAS"
    fi
    
    # Configure build
    print_status "Configuring EAS build..."
    eas build:configure
    
    print_success "EAS Build setup complete!"
}

# Build for iOS
build_ios() {
    print_status "Building for iOS..."
    read -p "Build profile (development/preview/production): " profile
    
    print_status "Starting iOS build with profile: $profile"
    eas build --platform ios --profile "$profile"
}

# Build for Android
build_android() {
    print_status "Building for Android..."
    read -p "Build profile (development/preview/production): " profile
    
    print_status "Starting Android build with profile: $profile"
    eas build --platform android --profile "$profile"
}

# Build for both platforms
build_all() {
    print_status "Building for all platforms..."
    read -p "Build profile (development/preview/production): " profile
    
    print_status "Starting builds with profile: $profile"
    eas build --platform all --profile "$profile"
}

# Submit to App Store
submit_ios() {
    print_status "Submitting to App Store..."
    eas submit --platform ios --profile production
}

# Submit to Play Store
submit_android() {
    print_status "Submitting to Play Store..."
    
    if [ ! -f "google-service-account.json" ]; then
        print_error "google-service-account.json not found. Please add it for Play Store submission."
        return 1
    fi
    
    eas submit --platform android --profile production
}

# Run pre-deployment checks
pre_deployment_checks() {
    print_status "Running pre-deployment checks..."
    
    # Check for console.log statements
    print_status "Checking for console.log statements..."
    log_count=$(grep -r "console.log" --include="*.js" --include="*.jsx" --exclude-dir=node_modules . | wc -l)
    if [ "$log_count" -gt 0 ]; then
        print_warning "Found $log_count console.log statements. Consider removing them for production."
    else
        print_success "No console.log statements found"
    fi
    
    # Check dependencies
    print_status "Checking for outdated dependencies..."
    npm outdated || true
    
    # Check for TODO comments
    print_status "Checking for TODO comments..."
    todo_count=$(grep -r "TODO" --include="*.js" --include="*.jsx" --exclude-dir=node_modules . | wc -l)
    if [ "$todo_count" -gt 0 ]; then
        print_warning "Found $todo_count TODO comments"
    else
        print_success "No TODO comments found"
    fi
    
    # Verify environment variables
    print_status "Checking production environment variables..."
    if [ -f ".env.production" ]; then
        print_success ".env.production exists"
    else
        print_error ".env.production is missing"
    fi
}

# Clean build cache
clean_cache() {
    print_status "Cleaning build cache..."
    
    # Clean Expo cache
    print_status "Cleaning Expo cache..."
    npx expo start --clear
    
    # Clean metro cache
    print_status "Cleaning Metro cache..."
    npx react-native start --reset-cache
    
    # Clean watchman
    if command_exists watchman; then
        print_status "Cleaning Watchman cache..."
        watchman watch-del-all
    fi
    
    print_success "Cache cleaned successfully!"
}

# Main loop
main() {
    while true; do
        show_menu
        
        case $choice in
            1) check_readiness ;;
            2) setup_eas ;;
            3) build_ios ;;
            4) build_android ;;
            5) build_all ;;
            6) submit_ios ;;
            7) submit_android ;;
            8) pre_deployment_checks ;;
            9) clean_cache ;;
            0) 
                print_status "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main
