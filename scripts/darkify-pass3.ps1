# Darkify pass 3 — artifact repair + brand gradient → gold/electric-blue
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\app'

$map = [ordered]@{
  # repair pass-1/2 artifacts
  'bg-emerald-500/100/15'        = 'bg-emerald-500/15'
  'border-[#d4af37]/60/30'       = 'border-[#d4af37]/30'
  'bg-red-500/100/15'            = 'bg-red-500/15'
  'bg-red-500/100'               = 'bg-red-500'
  # brand gradient text: green→emerald becomes gold→electric-blue
  'from-green-400/0'             = 'from-[#d4af37]/0'
  'to-emerald-400/10'            = 'to-[#3b82f6]/10'
  'from-green-400 via-emerald-300' = 'from-[#d4af37] via-yellow-300'
  'from-emerald-300 via-green-400' = 'from-[#3b82f6] via-yellow-400'
  'hover:text-green-400'         = 'hover:text-[#d4af37]'
  'fill-green-400'               = 'fill-[#d4af37]'
  'from-green-400'               = 'from-[#d4af37]'
  'via-emerald-300'              = 'via-yellow-300'
  'to-emerald-300'               = 'to-[#3b82f6]'
  'to-cyan-300'                  = 'to-[#3b82f6]'
  'text-green-400'               = 'text-[#d4af37]'
  'bg-green-400/10'              = 'bg-[#d4af37]/10'
  # status legibility on dark
  'text-emerald-600'             = 'text-emerald-400'
  # icon-on-white-chip contrast (wishlist heart)
  'bg-white/90 p-2 text-slate-400' = 'bg-white/90 p-2 text-slate-600'
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