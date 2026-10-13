# Darkify pass 2 — accents + artifact repair
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\app'

$map = [ordered]@{
  # repair double-replacement artifacts from pass 1
  'bg-red-500/100/100/10' = 'bg-red-500/10'
  'bg-red-500/100/10'     = 'bg-red-500/10'
  # remaining green accents → gold (design-system accent)
  'text-green-600'        = 'text-[#d4af37]'
  'text-green-500/60'     = 'text-[#d4af37]/60'
  'text-green-500'        = 'text-[#d4af37]'
  'hover:text-green-500'  = 'hover:text-[#d4af37]'
  'accent-green-600'      = 'accent-[#d4af37]'
  'fill-green-600'        = 'fill-[#d4af37]'
  'border-green-600'      = 'border-[#d4af37]'
  'peer-checked:border-green-600' = 'peer-checked:border-[#d4af37]'
  'shadow-green-600/20'   = 'shadow-amber-500/25'
  'shadow-green-500/25'   = 'shadow-amber-500/25'
  'shadow-green-500/20'   = 'shadow-amber-500/25'
}

$files = Get-ChildItem -Path $root -Recurse -Filter *.tsx | Where-Object { $_.FullName -notlike '*node_modules*' }
$changed = 0
foreach ($f in $files) {
  $content = Get-Content -LiteralPath $f.FullName -Raw
  $original = $content
  foreach ($key in $map.Keys) {
    $content = $content.Replace($key, $map[$key])
  }
  if ($content -ne $original) {
    Set-Content -LiteralPath $f.FullName -Value $content -NoNewline -Encoding UTF8
    $changed++
    Write-Host ("updated " + $f.Name)
  }
}
Write-Host "Done. $changed files updated."