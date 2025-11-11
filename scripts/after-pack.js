/**
 * After-pack hook for electron-builder
 * Ensures Playwright browsers are properly installed in the packaged app
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  console.log('[AFTER-PACK] Running after-pack script...');
  console.log('[AFTER-PACK] Platform:', electronPlatformName);
  console.log('[AFTER-PACK] App output directory:', appOutDir);

  // Determine the path to the unpacked app resources
  let resourcesPath;
  if (electronPlatformName === 'darwin') {
    // macOS: Testmug.app/Contents/Resources
    resourcesPath = path.join(appOutDir, 'Testmug.app', 'Contents', 'Resources');
  } else if (electronPlatformName === 'win32') {
    // Windows: resources folder in app directory
    resourcesPath = path.join(appOutDir, 'resources');
  } else {
    // Linux
    resourcesPath = path.join(appOutDir, 'resources');
  }

  console.log('[AFTER-PACK] Resources path:', resourcesPath);

  // Path to the unpacked playwright-core (should be in app.asar.unpacked/node_modules)
  const playwrightPath = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'playwright-core');

  if (!fs.existsSync(playwrightPath)) {
    console.log('[AFTER-PACK] WARNING: playwright-core not found at:', playwrightPath);
    console.log('[AFTER-PACK] Skipping browser installation');
    return;
  }

  console.log('[AFTER-PACK] Found playwright-core at:', playwrightPath);

  try {
    // Install Chromium browser for Playwright
    // Note: We use the playwright-core from the unpacked asar
    console.log('[AFTER-PACK] Installing Playwright Chromium browser...');

    const installCommand = electronPlatformName === 'win32'
      ? `cd "${playwrightPath}" && node cli.js install chromium`
      : `cd "${playwrightPath}" && node cli.js install chromium`;

    execSync(installCommand, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // Store browsers inside the app's resources
        PLAYWRIGHT_BROWSERS_PATH: path.join(resourcesPath, 'playwright-browsers')
      }
    });

    console.log('[AFTER-PACK] Playwright browsers installed successfully!');
  } catch (error) {
    console.error('[AFTER-PACK] Failed to install Playwright browsers:', error.message);
    console.error('[AFTER-PACK] The app may not work correctly without browsers.');
  }
};
