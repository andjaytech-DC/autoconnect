# Darkify pass 4 — final stragglers
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\app'

$map = [ordered]@{
  # artifacts
  'bg-emerald-500/100/10'   = 'bg-emerald-500/10'
  'border-[#d4af37]/60/25'  = 'border-[#d4af37]/25'
  'text-black-300'          = 'text-[#d4af37]'
  # light page backgrounds → dark
  'from-gray-50 via-white to-green-50' = 'from-[#121212] via-[#141a21] to-[#0b0e12]'
  'from-emerald-100 via-white to-green-50' = 'from-[#121212] via-[#141a21] to-[#0b0e12]'
  'from-green-50'           = 'from-[#141a21]'
  'via-white'               = 'via-[#161b21]'
  'to-green-50'             = 'to-[#0b0e12]'
  'from-emerald-100'        = 'from-[#1d232b]'
  'to-emerald-100'          = 'to-[#141a21]'
  'from-green-100'          = 'from-[#1d232b]'
  'to-green-100'            = 'to-[#141a21]'
  # badge/label accents → gold
  'text-green-300'          = 'text-[#d4af37]'
  'text-green-800'          = 'text-emerald-400'
  'text-green-900'          = 'text-emerald-400'
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
    Write-Host ("updated " + $f.FullName.Replace((Get-Item $root).Parent.FullName + '\', ''))
  }
}
Write-Host "Done. $changed files updated."