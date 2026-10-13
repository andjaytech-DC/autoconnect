# Darkify — one-shot light→dark token migration for Progressive AutoHub
# Safe, idempotent, reviewable mapping. Only touches app/**/*.tsx.
$ErrorActionPreference = 'Stop'

# Ordered mapping: specific (prefixed) rules first, then general token rules.
$map = [ordered]@{
  # --- disabled states (visible on dark) ---
  'disabled:bg-gray-100'      = 'disabled:bg-white/[0.04]'
  'disabled:text-gray-400'    = 'disabled:text-slate-500'
  'disabled:hover:bg-gray-50' = 'disabled:hover:bg-transparent'
  # --- placeholders ---
  'placeholder:text-gray-400' = 'placeholder:text-slate-400'
  'placeholder:text-gray-500' = 'placeholder:text-slate-500'
  'placeholder-gray-400'      = 'placeholder:text-slate-400'
  'placeholder-gray-500'      = 'placeholder:text-slate-500'
  # --- brand CTA gradients (green/emerald → gold/electric-blue) ---
  'from-green-500'            = 'from-[#d4af37]'
  'via-green-500'             = 'via-yellow-500'
  'to-green-600'              = 'to-yellow-500'
  'from-emerald-500'          = 'from-[#d4af37]'
  'to-emerald-600'            = 'to-yellow-500'
  'from-emerald-400'          = 'from-[#d4af37]'
  'via-teal-300'              = 'via-yellow-300'
  'to-teal-300'               = 'to-yellow-300'
  'to-cyan-400'               = 'to-[#3b82f6]'
  'hover:from-green-600'      = 'hover:brightness-110'
  'hover:to-emerald-700'      = ''
  'hover:bg-green-700'        = 'hover:brightness-110'
  'bg-green-600'              = 'bg-[#d4af37]'
  # --- hover accent links ---
  'hover:text-green-700'      = 'hover:text-[#d4af37]'
  'hover:text-green-600'      = 'hover:text-[#d4af37]'
  # --- focus rings (gold) ---
  'focus:ring-green-500'      = 'focus:ring-[#d4af37]/40'
  'focus:border-green-500'    = 'focus:border-[#d4af37]/60'
  'ring-green-500'            = 'ring-[#d4af37]/40'
  'border-green-500'          = 'border-[#d4af37]/60'
  # --- success / error states (legible on dark) ---
  'bg-green-50'               = 'bg-emerald-500/10'
  'bg-green-100'              = 'bg-emerald-500/15'
  'border-green-100'          = 'border-emerald-500/20'
  'border-green-200'          = 'border-emerald-500/30'
  'text-green-700'            = 'text-emerald-400'
  'bg-red-50'                 = 'bg-red-500/10'
  'bg-red-100'                = 'bg-red-500/10'
  'border-red-200'            = 'border-red-500/30'
  'border-red-300'            = 'border-red-500/40'
  'text-red-700'              = 'text-red-400'
  'text-red-600'              = 'text-red-400'
  'hover:bg-red-50'           = 'hover:bg-red-500/10'
  # --- neutral surfaces ---
  'bg-gray-50'                = 'bg-[#141a21]'
  'bg-gray-100'               = 'bg-[#161b21]'
  'bg-gray-200'               = 'bg-[#1d232b]'
  'bg-slate-50'               = 'bg-[#141a21]'
  'bg-slate-100'              = 'bg-[#161b21]'
  'bg-slate-200'              = 'bg-[#1d232b]'
  'hover:bg-gray-100'         = 'hover:bg-white/[0.08]'
  'hover:bg-slate-100'        = 'hover:bg-white/[0.08]'
  # --- neutral borders / dividers ---
  'border-gray-100'           = 'border-white/[0.06]'
  'border-gray-200'           = 'border-white/10'
  'border-gray-300'           = 'border-white/10'
  'border-slate-100'          = 'border-white/[0.06]'
  'border-slate-200'          = 'border-white/10'
  'border-slate-300'          = 'border-white/10'
  'divide-gray-200'           = 'divide-white/10'
  'divide-slate-200'          = 'divide-white/10'
  # --- shadows ---
  'shadow-slate-900/10'       = 'shadow-black/50'
  'shadow-gray-900/10'        = 'shadow-black/50'
  # --- text (specific before general) ---
  'text-gray-900'             = 'text-white'
  'text-gray-800'             = 'text-white'
  'text-gray-700'             = 'text-slate-200'
  'text-gray-600'             = 'text-slate-300'
  'text-gray-500'             = 'text-slate-400'
  'text-gray-400'             = 'text-slate-500'
  'text-gray-300'             = 'text-slate-300'
  'text-gray-200'             = 'text-slate-200'
  'text-gray-100'             = 'text-slate-200'
  'text-slate-900'            = 'text-white'
  'text-slate-800'            = 'text-white'
  'text-slate-700'            = 'text-slate-200'
  'text-slate-600'            = 'text-slate-400'
  'text-slate-500'            = 'text-slate-400'
  # --- bare white surfaces (not translucent bg-white/NN) — handled by regex below ---
}

$files = Get-ChildItem -Path (Join-Path $PSScriptRoot '..\app') -Recurse -Filter *.tsx |
  Where-Object { $_.FullName -notlike '*node_modules*' }

$totalChanged = 0
$changedFiles = 0
foreach ($f in $files) {
  $content = Get-Content -LiteralPath $f.FullName -Raw
  $original = $content
  foreach ($key in $map.Keys) {
    $content = $content -replace [regex]::Escape($key).Replace('\\','\'), $map[$key]
  }
  # bg-white needs regex (negative lookahead), handled separately
  $content = $content -replace 'bg-white(?![/0-9.\[])(?!\])', 'bg-[#161b21]'
  # Gold-surface contrast: any line that paints a gold background must use dark text
  $lines = $content -split "`r?`n"
  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match 'bg-\[#d4af37\]|from-\[#d4af37\]') {
      $lines[$i] = $lines[$i] -replace 'text-white', 'text-[#15130a]'
    }
  }
  $content = $lines -join "`r`n"

  if ($content -ne $original) {
    Set-Content -LiteralPath $f.FullName -Value $content -NoNewline -Encoding UTF8
    $delta = 0
    $a = $original -split "`r?`n"; $b = $content -split "`r?`n"
    for ($i = 0; $i -lt [Math]::Max($a.Length, $b.Length); $i++) {
      if ($a[$i] -ne $b[$i]) { $delta++ }
    }
    $totalChanged += $delta
    $changedFiles++
    Write-Host ("{0,4} lines  {1}" -f $delta, $f.FullName.Replace((Get-Item (Join-Path $PSScriptRoot '..')).FullName + '\', ''))
  }
}
Write-Host "`nDone. $totalChanged lines updated across $changedFiles files."