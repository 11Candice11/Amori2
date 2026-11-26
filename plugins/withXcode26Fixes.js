/**
 * Expo config plugin: Xcode 26 / iOS 26 compatibility fixes.
 *
 * Patches applied to the generated Podfile inside post_install:
 *
 * 1. Deployment-target bump — Xcode 26 rejects any pod whose
 *    IPHONEOS_DEPLOYMENT_TARGET is below 14.0.  We raise every pod
 *    that is still below 15.1 (matching ios.deploymentTarget in
 *    Podfile.properties.json).
 *
 * 2. EXConstants script-phase disable — the "Generate app.config for
 *    prebuilt Constants.manifest" script fails when the repo path
 *    contains spaces.  Setting runOnlyForDeploymentPostprocessing = 1
 *    makes Xcode skip it during normal builds; the prebuilt manifest
 *    already ships the needed data.
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DEPLOYMENT_TARGET = '15.1';

// Ruby snippet inserted just before the closing `end` of post_install.
const PATCH_RUBY = `
    # ── Xcode 26 compatibility patches (withXcode26Fixes plugin) ──────────────

    # 1. Raise any pod still below iOS ${DEPLOYMENT_TARGET} — Xcode 26 requires 14.0+.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${DEPLOYMENT_TARGET}')
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET}'
        end
      end
    end

    # 2. Disable EXConstants script phase — fails when the path contains spaces.
    begin
      pbxproj_path = "\#{installer.pods_project.path}/project.pbxproj"
      content = File.read(pbxproj_path)
      lines = content.split("\\n")
      in_exconstants = false
      lines.map! do |line|
        if line.include?('Generate app.config for prebuilt Constants.manifest')
          in_exconstants = true
        end
        if in_exconstants && line.include?('runOnlyForDeploymentPostprocessing = 0')
          in_exconstants = false
          line.gsub('= 0', '= 1')
        else
          line
        end
      end
      File.write(pbxproj_path, lines.join("\\n"))
      Pod::UI.puts "\u2713 Disabled EXConstants script phase".yellow
    rescue => e
      Pod::UI.warn "Warning: \#{e.message}"
    end

    # ── end Xcode 26 compatibility patches ────────────────────────────────────
`;

/**
 * Inserts PATCH_RUBY into the last `post_install do |installer|` block in the
 * Podfile, just before its closing `end`.  Safe to call multiple times — the
 * marker comment prevents double-insertion.
 */
function applyPodfilePatch(podfilePath) {
  let content = fs.readFileSync(podfilePath, 'utf8');

  if (content.includes('withXcode26Fixes plugin')) {
    // Already patched — nothing to do.
    return;
  }

  // Find the last `post_install do |installer|` block closing `end`.
  // Strategy: locate the block, then find its matching closing `end`.
  const blockStart = content.lastIndexOf('post_install do |installer|');
  if (blockStart === -1) {
    console.warn('[withXcode26Fixes] Could not find post_install block — patch skipped.');
    return;
  }

  // Walk from blockStart to find the matching `end` (tracking nesting).
  let depth = 0;
  let i = blockStart;
  let closingEndIndex = -1;

  while (i < content.length) {
    // Skip strings and comments crudely — good enough for a known Podfile shape.
    if (content[i] === '#') {
      // Skip to end of line.
      while (i < content.length && content[i] !== '\n') i++;
      continue;
    }

    // Match `do` or `{` as block openers, `end` or `}` as closers.
    if (content.slice(i, i + 2) === 'do' && /\W/.test(content[i + 2] || ' ')) {
      depth++;
      i += 2;
      continue;
    }
    if (content.slice(i, i + 3) === 'end' && /\W/.test(content[i + 3] || ' ') && /\W/.test(content[i - 1] || ' ')) {
      if (depth === 0) {
        closingEndIndex = i;
        break;
      }
      depth--;
      i += 3;
      continue;
    }
    i++;
  }

  if (closingEndIndex === -1) {
    console.warn('[withXcode26Fixes] Could not find closing end for post_install — patch skipped.');
    return;
  }

  content =
    content.slice(0, closingEndIndex) +
    PATCH_RUBY +
    content.slice(closingEndIndex);

  fs.writeFileSync(podfilePath, content, 'utf8');
  console.log('[withXcode26Fixes] Podfile patched successfully.');
}

module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      applyPodfilePatch(podfilePath);
      return cfg;
    },
  ]);
