# WCAG contrast audit for the Progressive AutoHub dark theme
# Computes contrast ratios for the key text/background pairs and flags WCAG AA failures.
$ErrorActionPreference = 'Stop'

function hslToRgb($h, $s, $l) {
  $s /= 100; $l /= 100
  $k = { param($n) ($n + $h / 30) % 12 }
  $a = $s * [Math]::Min($l, 1 - $l)
  $f = { param($n) $l - $a * [Math]::Max(-1, [Math]::Min((&$k $n) - 3, [Math]::Min(9 - (&$k $n), 1))) }
  return @([int](&$f 0 * 255), [int](&$f 8 * 255), [int](&$f 4 * 255))
}

function linear($c) {
  $c /= 255
  if ($c -le 0.03928) { return $c / 12.92 }
  return [Math]::Pow(($c + 0.055) / 1.055, 2.4)
}

function lum($rgb) {
  return 0.2126 * (linear $rgb[0]) + 0.7152 * (linear $rgb[1]) + 0.0722 * (linear $rgb[2])
}

function contrast($fg, $bg) {
  $l1 = lum $fg; $l2 = lum $bg
  if ($l2 -gt $l1) { $tmp = $l1; $l1 = $l2; $l2 = $tmp }
  return ($l1 + 0.05) / ($l2 + 0.05)
}

# Theme tokens (HSL) from globals.css :root
$bg       = hslToRgb 220 14 7      # --color-bg  (#121212-ish)
$card     = hslToRgb 222 12 10     # --color-card
$bg2      = hslToRgb 220 12 10     # --color-bg-secondary
$primary  = hslToRgb 0 0 100       # --color-text-primary (white)
$secondary= hslToRgb 220 12 72     # --color-text-secondary
$muted    = hslToRgb 220 10 55     # --color-text-muted
$gold     = hslToRgb 45 60 52      # --color-accent
$blue     = hslToRgb 217 91 60     # --color-primary (electric blue)

# Tailwind slate used in migrated classes
$slate300 = hslToRgb 202 13 93     # actually #cbd5e1 -> use literal below
$slate400 = @(148,163,184)         # #94a3b8
$slate500 = @(100,116,139)         # #64748b
$white    = @(255,255,255)
$darkTxt  = @(21,19,10)            # #15130a (text on gold)

function chk($name, $fg, $bg, $isLarge) {
  $ratio = [Math]::Round((contrast $fg $bg), 2)
  $threshold = if ($isLarge) { 3.0 } else { 4.5 }
  $status = if ($ratio -ge $threshold) { 'PASS' } else { 'FAIL' }
  Write-Output ("{0,-42} {1,5}:1  {2}  (need {3}:1{4})" -f $name, $ratio, $status, $threshold, $(if($isLarge){' large'}else{''}))
}

Write-Output "=== WCAG AA Contrast Audit (dark theme) ===`n"
chk "white text on bg (#121212)"        $white    $bg   $false
chk "white text on card"                $white    $card $false
chk "text-secondary on bg"              $secondary $bg  $false
chk "text-secondary on card"            $secondary $card $false
chk "text-muted on bg"                  $muted    $bg   $false
chk "text-muted on card (RISKY)"        $muted    $card $false
chk "slate-400 on card (RISKY)"         $slate400 $card $false
chk "slate-500 on card (RISKY)"         $slate500 $card $false
chk "slate-300 on card"                 $slate300 $card $false
chk "gold #d4af37 on bg (large/accent)" $gold     $bg   $true
chk "gold #d4af37 on bg (normal text)"  $gold     $bg   $false
chk "electric blue on bg (large)"       $blue     $bg   $true
chk "electric blue on bg (normal)"      $blue     $bg   $false
chk "#15130a on gold (buttons)"         $darkTxt  $gold $false
chk "white on gold (large badge)"       $white    $gold $true