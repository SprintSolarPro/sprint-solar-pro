# clean_edge_metadata.ps1
# Backs up and removes raw edge_all_open_tabs assignments and duplicate loaders,
# ensures a single safe loader in app.js and a single app.js include in index.html.
# Run from project root.

$timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$projectRoot = Get-Location

# Files to consider (search .js and index.html)
$jsFiles = Get-ChildItem -Path $projectRoot -Recurse -File -Include *.js -ErrorAction SilentlyContinue
$indexFiles = Get-ChildItem -Path $projectRoot -Recurse -File -Include index.html -ErrorAction SilentlyContinue

if (-not $jsFiles -and -not $indexFiles) {
  Write-Host "No .js or index.html files found under $projectRoot"
  exit 1
}

# Patterns
$rawAssignPattern = 'edge_all_open_tabs\s*=\s*

\[[\s\S]*?\]

\s*;?'
# Rough pattern to match loader IIFE that references edgeTabsData and defineProperty
$loaderIifePattern = '\(function\(\)\s*\{\s*[\s\S]*?edgeTabsData[\s\S]*?defineProperty\s*\([\s\S]*?window\s*,\s*["'']edge_all_open_tabs["''][\s\S]*?\}\)\s*\)\s*;?'

# Idempotent loader to insert into app.js (single copy)
$idempotentLoader = @'
/* Safe edgeTabsData loader (idempotent and tolerant) */
(function(){
  try {
    const el = document.getElementById('edgeTabsData');
    let parsed = [];
    if (el && el.textContent) {
      try { parsed = JSON.parse(el.textContent || '[]'); } catch (parseErr) { parsed = []; console.warn('edgeTabsData parse failed', parseErr); }
    } else {
      parsed = [];
    }

    if (!Object.prototype.hasOwnProperty.call(window, 'edge_all_open_tabs')) {
      try {
        Object.defineProperty(window, 'edge_all_open_tabs', { value: parsed, writable: false, configurable: false });
        console.log('edge_all_open_tabs defined (loader)');
      } catch (e) {
        try { window.edge_all_open_tabs = parsed; console.log('edge_all_open_tabs assigned (fallback)'); } catch (err) { console.warn('Could not set edge_all_open_tabs', err); }
      }
    } else {
      try {
        window.edge_all_open_tabs = parsed;
        console.log('edge_all_open_tabs updated (existing)');
      } catch (e) {
        console.log('edge_all_open_tabs exists and is not writable; leaving existing value');
      }
    }
  } catch (err) {
    console.warn('edgeTabsData loader error; continuing with empty array', err);
    if (!Object.prototype.hasOwnProperty.call(window, 'edge_all_open_tabs')) {
      try { window.edge_all_open_tabs = []; } catch (e) {}
    }
  }
})();
'@

# Function to backup a file
function Backup-File($path) {
  $bak = "$path.bak_$timestamp"
  Copy-Item -Path $path -Destination $bak -Force
  Write-Host "Backup created: $bak"
}

# 1) Clean JS files: remove raw assignment blocks and duplicate loader IIFEs
foreach ($file in $jsFiles) {
  try {
    $content = Get-Content -Raw -Path $file.FullName -ErrorAction Stop

    $modified = $false

    # Remove raw assignment blocks
    if ($content -match $rawAssignPattern) {
      Backup-File $file.FullName
      $content = [regex]::Replace($content, $rawAssignPattern, '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $modified = $true
      Write-Host "Removed raw edge_all_open_tabs assignment from $($file.FullName)"
    }

    # Remove duplicate loader IIFEs (but keep one copy later)
    # We'll remove all occurrences here; we'll re-insert a single idempotent loader into the main app.js later.
    if ($content -match $loaderIifePattern) {
      if (-not $modified) { Backup-File $file.FullName }
      $content = [regex]::Replace($content, $loaderIifePattern, '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $modified = $true
      Write-Host "Removed loader IIFE from $($file.FullName)"
    }

    if ($modified) {
      # Trim excessive blank lines
      $content = $content -replace "(\r?\n){3,}", "`r`n`r`n"
      Set-Content -Path $file.FullName -Value $content -Force
      Write-Host "Updated $($file.FullName)"
    }
  } catch {
    Write-Warning "Failed to process $($file.FullName): $_"
  }
}

# 2) Ensure exactly one idempotent loader in the main app.js
# Choose canonical app.js: prefer 'app.js' in project root; otherwise first app*.js found
$canonicalApp = $jsFiles | Where-Object { $_.Name -ieq 'app.js' } | Select-Object -First 1
if (-not $canonicalApp) {
  $canonicalApp = $jsFiles | Where-Object { $_.Name -match '^app' } | Select-Object -First 1
}
if ($canonicalApp) {
  try {
    $appPath = $canonicalApp.FullName
    $appContent = Get-Content -Raw -Path $appPath -ErrorAction Stop

    # If loader already present (idempotent or similar), remove any leftover loader patterns first
    $appContent = [regex]::Replace($appContent, $loaderIifePattern, '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $appContent = [regex]::Replace($appContent, $rawAssignPattern, '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    # Insert the idempotent loader near the top (after any initial comments or "use strict")
    # Find first non-comment line index
    $lines = $appContent -split "(\r?\n)"
    $insertIndex = 0
    for ($i = 0; $i -lt $lines.Length; $i++) {
      $line = $lines[$i].Trim()
      if ($line -ne '' -and -not $line.StartsWith('/*') -and -not $line.StartsWith('//') -and -not $line.StartsWith('<!')) {
        $insertIndex = $i
        break
      }
    }

    # Rebuild content with loader inserted before insertIndex
    $before = ($lines[0..($insertIndex-1)] -join '')
    $after = ($lines[$insertIndex..($lines.Length-1)] -join '')
    Backup-File $appPath
    $newAppContent = $before + "`r`n" + $idempotentLoader + "`r`n" + $after
    # Clean up multiple blank lines
    $newAppContent = $newAppContent -replace "(\r?\n){3,}", "`r`n`r`n"
    Set-Content -Path $appPath -Value $newAppContent -Force
    Write-Host "Inserted idempotent loader into $appPath (backup created)."
  } catch {
    Write-Warning "Failed to update canonical app.js: $_"
  }
} else {
  Write-Warning "No app.js-like file found to insert loader into. Skipping insertion."
}

# 3) Update index.html: ensure single app.js include and add edgeTabsData script before it
foreach ($indexFile in $indexFiles) {
  try {
    $indexPath = $indexFile.FullName
    $indexContent = Get-Content -Raw -Path $indexPath -ErrorAction Stop

    Backup-File $indexPath

    # Remove duplicate app.js script tags but keep the first occurrence
    $scriptPattern = '<script\b[^>]*\bsrc\s*=\s*["'']([^"'']*app\.js)["''][^>]*>\s*</script>'
    $matches = [regex]::Matches($indexContent, $scriptPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($matches.Count -gt 1) {
      # Keep first match, remove others
      $first = $matches[0].Value
      $indexContent = [regex]::Replace($indexContent, $scriptPattern, { param($m) if ($m.Value -eq $first) { $m.Value } else { "" } }, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      Write-Host "Removed duplicate app.js script tags in $indexPath"
    }

    # Ensure edgeTabsData script exists immediately before the app.js script
    # Find the app.js script tag (first occurrence)
    $appScriptMatch = [regex]::Match($indexContent, $scriptPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($appScriptMatch.Success) {
      $appScriptTag = $appScriptMatch.Value
      $edgeScriptTag = '<script id="edgeTabsData" type="application/json">[]</script>'

      # Check if edgeTabsData already exists anywhere
      if ($indexContent -notmatch '<script[^>]*id\s*=\s*["'']edgeTabsData["''][^>]*>') {
        # Insert edgeScriptTag immediately before the appScriptTag
        $indexContent = $indexContent -replace [regex]::Escape($appScriptTag), ($edgeScriptTag + "`r`n" + $appScriptTag)
        Write-Host "Inserted <script id=\"edgeTabsData\"> placeholder before app.js in $indexPath"
      } else {
        Write-Host "index.html already contains edgeTabsData script; no insertion needed."
      }
    } else {
      Write-Warning "No app.js script tag found in $indexPath; skipping edgeTabsData insertion."
    }

    # Save updated index.html
    Set-Content -Path $indexPath -Value $indexContent -Force
    Write-Host "Updated $indexPath (backup created)."
  } catch {
    Write-Warning "Failed to update $($indexFile.FullName): $_"
  }
}

Write-Host "Cleaning complete. Please review backups (*.bak_*) and test the app in the browser."
