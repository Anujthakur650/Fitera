#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying UI Layout Fixes for Fitera App\n');

const issues = [];
const fixes = [];

// Define the files and expected fixes
const filesToCheck = [
  {
    path: 'screens/HomeScreen.js',
    name: 'Home Screen',
    checks: [
      {
        description: 'Active Workout Card padding fixed',
        searchStrings: ['activeWorkoutCard: {', 'padding: 0,'],
        expectedFix: 'Card padding set to 0 to let EnhancedCard handle internal spacing'
      },
      {
        description: 'Active Workout buttons properly aligned',
        searchStrings: ['activeWorkoutButtons: {', 'gap: THEME.spacing.md,', 'marginTop: THEME.spacing.md,'],
        expectedFix: 'Buttons have proper gap and margin spacing'
      },
      {
        description: 'Active Workout stats layout improved',
        searchStrings: ['activeWorkoutStats: {', 'justifyContent: \'space-between\',', 'paddingHorizontal: THEME.spacing.md,'],
        expectedFix: 'Stats properly distributed with horizontal padding'
      },
      {
        description: 'Stat items flex properly',
        searchStrings: ['activeWorkoutStatItem: {', 'flex: 1,'],
        expectedFix: 'Stat items use flex: 1 for equal spacing'
      }
    ]
  },
  {
    path: 'screens/ExercisesScreen.js',
    name: 'Exercises Screen',
    checks: [
      {
        description: 'Modal presentation style fixed',
        searchStrings: ['presentationStyle="overFullScreen"'],
        expectedFix: 'Custom exercise modal uses overFullScreen for better display'
      }
    ]
  },
  {
    path: 'screens/WelcomeScreen.js',
    name: 'Welcome/Onboarding Screen',
    checks: [
      {
        description: 'Scroll content has bottom padding',
        searchStrings: ['scrollContent: {', 'paddingBottom: THEME.spacing.xl,'],
        expectedFix: 'Added bottom padding to prevent content cutoff'
      },
      {
        description: 'Hero section spacing reduced',
        searchStrings: ['heroSection: {', 'paddingTop: THEME.spacing[\'2xl\'],', 'paddingBottom: THEME.spacing.lg,'],
        expectedFix: 'Reduced top and bottom padding for better space utilization'
      },
      {
        description: 'App name font size optimized',
        searchStrings: ['fontSize: THEME.typography.fontSize[\'4xl\'],'],
        expectedFix: 'Reduced font size from 5xl to 4xl'
      },
      {
        description: 'Feature cards size optimized',
        searchStrings: ['featureCard: {', 'padding: THEME.spacing.md,', 'minHeight: 120,'],
        expectedFix: 'Reduced padding and minimum height for feature cards'
      },
      {
        description: 'CTA section spacing optimized',
        searchStrings: ['ctaSection: {', 'paddingTop: THEME.spacing.lg,', 'paddingBottom: THEME.spacing.xl,'],
        expectedFix: 'Reduced padding to ensure Sign In button is visible'
      }
    ]
  },
  {
    path: 'screens/LoginScreen.js', 
    name: 'Login Screen',
    checks: [
      {
        description: 'Keyboard view has proper padding',
        searchStrings: ['keyboardView: {', 'paddingVertical: THEME.spacing.lg,'],
        expectedFix: 'Added vertical padding for better layout'
      }
    ]
  }
];

// Check each file
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  
  if (!fs.existsSync(filePath)) {
    issues.push(`❌ File not found: ${file.path}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📱 Checking ${file.name}:`);
  
  file.checks.forEach(check => {
    let allFound = true;
    
    check.searchStrings.forEach(searchString => {
      if (!content.includes(searchString)) {
        allFound = false;
      }
    });
    
    if (allFound) {
      fixes.push(`✅ ${check.description}`);
      console.log(`  ✅ ${check.description}`);
    } else {
      issues.push(`❌ ${file.name}: ${check.description} - Not properly implemented`);
      console.log(`  ❌ ${check.description} - Not found`);
    }
  });
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 UI LAYOUT FIX VERIFICATION SUMMARY');
console.log('='.repeat(60));

console.log(`\n✅ Fixes Applied: ${fixes.length}`);
fixes.forEach(fix => console.log(`  ${fix}`));

if (issues.length > 0) {
  console.log(`\n❌ Issues Found: ${issues.length}`);
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log('\n⚠️  Some UI fixes may not be properly applied!');
} else {
  console.log('\n🎉 All UI layout fixes have been successfully applied!');
}

console.log('\n📱 Expected Improvements:');
console.log('  1. Home Screen: Active Workout card properly aligned with consistent button spacing');
console.log('  2. Exercises Screen: Filter tabs work correctly, all exercises visible');
console.log('  3. Welcome Screen: Sign In button immediately visible without scrolling');
console.log('  4. Login Screen: Proper spacing and layout for all screen sizes');

console.log('\n🔧 Next Steps:');
console.log('  1. Restart the Expo development server');
console.log('  2. Test on various device sizes (iPhone SE, iPhone 14, iPad)');
console.log('  3. Verify all buttons and interactive elements are properly accessible');
console.log('  4. Ensure smooth transitions and animations');

process.exit(issues.length > 0 ? 1 : 0);
