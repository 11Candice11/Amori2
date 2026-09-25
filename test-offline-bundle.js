#!/usr/bin/env node

/**
 * Test script to verify the iOS bundle is properly configured for offline use
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${description}: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    return true;
  } else {
    console.log(`✗ ${description}: ${filePath} - NOT FOUND`);
    return false;
  }
}

function checkDirectory(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath);
    console.log(`✓ ${description}: ${dirPath} (${files.length} items)`);
    return true;
  } else {
    console.log(`✗ ${description}: ${dirPath} - NOT FOUND`);
    return false;
  }
}

function checkAppDelegate() {
  const appDelegatePath = 'ios/Amori/AppDelegate.mm';
  if (fs.existsSync(appDelegatePath)) {
    const content = fs.readFileSync(appDelegatePath, 'utf8');
    const hasCorrectConfig = content.includes('URLForResource:@"main" withExtension:@"jsbundle"');
    if (hasCorrectConfig) {
      console.log('✓ AppDelegate correctly configured for offline bundle');
      return true;
    } else {
      console.log('✗ AppDelegate not configured for offline bundle');
      return false;
    }
  } else {
    console.log('✗ AppDelegate.mm not found');
    return false;
  }
}

function checkDeploymentTarget() {
  const pbxprojPath = 'ios/Amori.xcodeproj/project.pbxproj';
  if (fs.existsSync(pbxprojPath)) {
    const content = fs.readFileSync(pbxprojPath, 'utf8');
    const hasCorrectTarget = content.includes('IPHONEOS_DEPLOYMENT_TARGET = 16.4;');
    if (hasCorrectTarget) {
      console.log('✓ iOS deployment target set to 16.4');
      return true;
    } else {
      console.log('✗ iOS deployment target not set to 16.4');
      return false;
    }
  } else {
    console.log('✗ Xcode project file not found');
    return false;
  }
}

console.log('🚀 Testing iOS offline bundle configuration...\n');

let allChecks = true;

// Check bundle files
allChecks &= checkFile('ios/main.jsbundle', 'Main JavaScript bundle');
allChecks &= checkDirectory('ios/assets', 'Assets directory');

// Check configuration
allChecks &= checkAppDelegate();
allChecks &= checkDeploymentTarget();

// Check Podfile configuration
allChecks &= checkFile('ios/Podfile.properties.json', 'Podfile properties');

console.log('\n' + '='.repeat(50));
if (allChecks) {
  console.log('🎉 All checks passed! The iOS bundle is configured for offline use.');
  console.log('\nTo build and test:');
  console.log('1. Open ios/Amori.xcworkspace in Xcode');
  console.log('2. Select "Release" scheme');
  console.log('3. Build and run on device or simulator');
  console.log('4. The app should run without Metro server');
} else {
  console.log('❌ Some checks failed. Please review the issues above.');
}

process.exit(allChecks ? 0 : 1);