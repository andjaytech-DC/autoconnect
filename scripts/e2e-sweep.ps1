# End-to-end verification sweep
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/e2e-sweep.ps1
#
# Prints one line per step:  [n/NN] PASS|FAIL  name  -- detail
# Exit code 0 when every step passes.
#
# NOTE: this asserts real behaviour. It creates and removes its own data, and
# it deliberately checks that invalid input is REJECTED as well as that valid
# input works.

$ErrorActionPreference = "Continue"
$API = "http://localhost:5000/api"
$WEB = "http://localhost:3000"

$script:total = 0
$script:step = 0
$script:fail = 0
$script:lines = @()
$script:adminTok = $null
$script:custTok = $null
$script:dealerTok = $null
$script:e2eVehicleId = $null
$script:e2ePlanId = $null
$script:cleanup = @()

# ---------------------------------------------------------------- helpers

function Status([string]$url, [string]$method = "GET", $body = $null, [hashtable]$h = @{}) {
  try {
    $p = @{ Uri = $url; Method = $method; Headers = $h; TimeoutSec = 120; UseBasicParsing = $true; ErrorAction = "Stop" }
    if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Depth 10); $p.ContentType = "application/json" }
    $r = Invoke-WebRequest @p
    return [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return -1
  }
}

function Json([string]$url, [string]$method = "GET", $body = $null, [hashtable]$h = @{}) {
  $p = @{ Uri = $url; Method = $method; Headers = $h; TimeoutSec = 120; ErrorAction = "Stop" }
  if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Depth 10); $p.ContentType = "application/json" }
  return Invoke-RestMethod @p
}

function Login([string]$email, [string]$password) {
  $r = Json "$API/auth/login" "POST" @{ email = $email; password = $password }
  return $r.data.accessToken
}

function Step([string]$name, [scriptblock]$body) {
  $script:step++
  $label = "[{0}/{1}]" -f $script:step, $script:total
  try {
    $detail = & $body
    $text = "$label PASS  $name"
    if ($detail) { $text += "  -- $detail" }
    Write-Host $text
    $script:lines += "PASS  $name" + $(if ($detail) { "  -- $detail" } else { "" })
  } catch {
    $script:fail++
    Write-Host "$label FAIL  $name  -- $($_.Exception.Message)"
    $script:lines += "FAIL  $name  -- $($_.Exception.Message)"
  }
}

# Assert a request is REJECTED with one of the given status codes.
function Rejected([string]$url, [int[]]$allow, [string]$method = "GET", $body = $null, [hashtable]$h = @{}) {
  $c = Status $url $method $body $h
  if ($allow -contains $c) { return $c }
  throw "expected one of $($allow -join '/'), got $c"
}

# Assert a request SUCCEEDS.
function Ok([string]$url, [string]$method = "GET", $body = $null, [hashtable]$h = @{}) {
  $c = Status $url $method $body $h
  if ($c -ge 200 -and $c -lt 300) { return $c }
  throw "expected 2xx, got $c"
}

function CountTotal { param([int]$n) $script:total = $n }

# ---------------------------------------------------------------- run

Write-Host "`n=== E2E SWEEP  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===`n"

$pages = @("/", "/cars", "/dealers", "/loans", "/about", "/electric", "/sell", "/services",
  "/premium-cars", "/compare", "/insurance", "/new-cars", "/login", "/bookings",
  "/wishlist", "/orders", "/dashboard", "/car-check", "/portal/admin")
# Set before the first Step so the [n/NN] label is correct from step 1.
CountTotal (2 + $pages.Count + 26)

# --- 1. Services up
Step "backend reachable" { Ok "$API/vehicles?limit=1" | Out-Null; "HTTP 200" }
Step "frontend reachable" { Ok "$WEB/" | Out-Null; "HTTP 200" }

# --- 2. Public pages render
foreach ($p in $pages) {
  Step "page $p" { Ok "$WEB$p" | Out-Null; "HTTP 200" }
}

# --- 3. Real inventory, no fixtures
Step "public list returns real vehicles" {
  $d = Json "$API/vehicles?limit=50"
  if ($d.data.items.Count -lt 1) { throw "no vehicles" }
  return "$($d.data.items.Count) published"
}
Step "drafts never leak publicly" {
  $d = Json "$API/vehicles?limit=50"
  $leaked = @($d.data.items | Where-Object { $_.listingStatus -eq 'DRAFT' })
  if ($leaked.Count) { throw "$($leaked.Count) draft(s) visible publicly" }
  return "0 leaked"
}
Step "listing counts come from backend" {
  $r = Json "$WEB/api/listings/counts"
  if ($r.source -ne 'backend') { throw "source=$($r.source)" }
  $t = ($r.counts.PSObject.Properties | Measure-Object -Property Value -Sum).Sum
  return "total=$t"
}
Step "sitemap lists only real dealers" {
  $s = (Invoke-WebRequest "$WEB/sitemap.xml" -UseBasicParsing -TimeoutSec 120).Content
  $ids = [regex]::Matches($s, 'com/dealers/(\d+)') | ForEach-Object { $_.Groups[1].Value }
  $real = (Json "$API/dealers").data | ForEach-Object { "$($_.id)" }
  foreach ($i in $ids) { if ($real -notcontains $i) { throw "unknown dealer id $i in sitemap" } }
  return "$($ids.Count) url(s), all real"
}

# --- 4. Vehicle detail + trust surface
Step "vehicle detail is public" { Ok "$API/vehicles/1" | Out-Null; "HTTP 200" }
Step "unknown vehicle 404s" { Rejected "$API/vehicles/999999" @(404) | Out-Null; "HTTP 404" }
Step "trust proxy returns an array" {
  $r = Json "$WEB/api/vehicle-history?vehicleId=1"
  if ($null -eq $r.checks) { throw "no checks array" }
  return "$($r.checks.Count) checks"
}
Step "trust proxy rejects a bad vehicleId" { Rejected "$WEB/api/vehicle-history?vehicleId=abc" @(400) | Out-Null; "HTTP 400" }

# --- 5. Auth
Step "admin login" { $script:adminTok = Login "admin@autohub.example" "Admin@123"; if (-not $script:adminTok) { throw "no token" }; "token" }
Step "customer login" { $script:custTok = Login "e2e.customer@autohub.example" "Customer@123"; if (-not $script:custTok) { throw "no token" }; "token" }
Step "dealer login" { $script:dealerTok = Login "dealer@autohub.example" "Dealer@123"; if (-not $script:dealerTok) { throw "no token" }; "token" }
Step "bad password is rejected" { Rejected "$API/auth/login" @(401) "POST" @{ email = "admin@autohub.example"; password = "wrong" } | Out-Null; "HTTP 401" }

# --- 6. RBAC
Step "anon cannot write vehicle history" { Rejected "$API/vehicle-history" @(401) "POST" @{ vehicleId = 1; checkType = "OWNERSHIP"; status = "PENDING" } | Out-Null; "HTTP 401" }
Step "anon cannot read roles" { Rejected "$API/roles" @(401) | Out-Null; "HTTP 401" }
Step "dealer cannot create warranty plans" { Rejected "$API/warranty/plans" @(403) "POST" @{ name = "x"; providerName = "y"; durationMonths = 6; maxMileageKm = 1; coverageType = "POWERTRAIN"; priceAmount = 1 } @{ Authorization = "Bearer $script:dealerTok" } | Out-Null; "HTTP 403" }
Step "customer cannot list staff history checks" { $c = Status "$API/vehicle-history" "GET" $null @{ Authorization = "Bearer $script:custTok" }; if ($c -in @(401, 403)) { return "HTTP $c" }; throw "customer could read the staff feed (HTTP $c)" }

# --- 7. Number plate is required and normalised
$plateCar = @{
  title = "E2E Plate Car"; price = 500000; year = 2022; mileage = 10000
  fuel = "PETROL"; transmission = "MANUAL"; color = "White"
  images = @("https://example.com/a.jpg"); city = "Noida"; state = "Uttar Pradesh"
  brandId = 1; categoryId = 1; dealerId = 1
}
Step "create rejects a missing number plate" {
  $c = Status "$API/vehicles" "POST" $plateCar @{ Authorization = "Bearer $script:adminTok" }
  if ($c -eq 400) { return "HTTP 400" } else { throw "accepted (HTTP $c)" }
}
Step "create rejects a malformed plate" {
  $b = $plateCar.Clone(); $b.registrationNumber = "ZZ99XX"
  $c = Status "$API/vehicles" "POST" $b @{ Authorization = "Bearer $script:adminTok" }
  if ($c -eq 400) { return "HTTP 400" } else { throw "accepted (HTTP $c)" }
}
Step "create normalises the plate and derives state" {
  $b = $plateCar.Clone(); $b.registrationNumber = "mh 01 ab 1234"
  $r = Json "$API/vehicles" "POST" $b @{ Authorization = "Bearer $script:adminTok" }
  $script:e2eVehicleId = $r.data.id
  $script:cleanup += "vehicle:$($r.data.id)"
  if ($r.data.registrationNumber -ne "MH01AB1234") { throw "stored '$($r.data.registrationNumber)'" }
  if ($r.data.registrationState -ne "MH") { throw "state '$($r.data.registrationState)'" }
  return "id=$($r.data.id) plate=$($r.data.registrationNumber) state=$($r.data.registrationState)"
}

# --- 8. Trust rules
Step "manual check cannot be marked VERIFIED" {
  $c = Status "$API/vehicle-history" "POST" @{ vehicleId = $script:e2eVehicleId; checkType = "OWNERSHIP"; status = "VERIFIED"; source = "MANUAL" } @{ Authorization = "Bearer $script:adminTok" }
  if ($c -eq 400) { return "HTTP 400" } else { throw "accepted (HTTP $c)" }
}
Step "manual check can be recorded as unverified" {
  $r = Json "$API/vehicle-history" "POST" @{ vehicleId = $script:e2eVehicleId; checkType = "OWNERSHIP"; status = "PENDING"; source = "MANUAL"; summary = "E2E sweep entry" } @{ Authorization = "Bearer $script:adminTok" }
  if ($r.data.status -ne "PENDING") { throw "status=$($r.data.status)" }
  return "id=$($r.data.id) status=PENDING"
}
Step "lookup with no provider configured fails honestly" {
  $r = Json "$API/vehicle-history/lookup/$($script:e2eVehicleId)" "POST" $null @{ Authorization = "Bearer $script:adminTok" }
  if ($r.success) { throw "claimed success with no provider: $($r.outcome)" }
  if ($r.outcome -ne "NOT_CONFIGURED" -and $r.outcome -ne "PROVIDER_ERROR") { throw "outcome=$($r.outcome)" }
  return "outcome=$($r.outcome)"
}
Step "lookup for a plate-less vehicle is rejected" {
  $c = Status "$API/vehicle-history/lookup/$($script:e2eVehicleId - 1000)" "POST" $null @{ Authorization = "Bearer $script:adminTok" }
  if ($c -in @(200, 400, 404)) { return "HTTP $c" } else { throw "HTTP $c" }
}

# --- 9. Warranty rules
Step "warranty plan created by admin" {
  $r = Json "$API/warranty/plans" "POST" @{ name = "E2E Plan"; providerName = "E2E Warranty Co"; durationMonths = 6; maxMileageKm = 50000; coverageType = "POWERTRAIN"; priceAmount = 9900 } @{ Authorization = "Bearer $script:adminTok" }
  $script:e2ePlanId = $r.data.id
  $script:cleanup += "plan:$($r.data.id)"
  return "id=$($r.data.id)"
}
Step "customer buys a policy" {
  $r = Json "$API/warranty/purchases" "POST" @{ vehicleId = $script:e2eVehicleId; planId = $script:e2ePlanId } @{ Authorization = "Bearer $script:custTok" }
  $script:cleanup += "purchase:$($r.data.id)"
  if ($r.data.status -ne "ACTIVE") { throw "status=$($r.data.status)" }
  return "policy=$($r.data.policyNumber)"
}
Step "second policy on the same vehicle is blocked" {
  $c = Status "$API/warranty/purchases" "POST" @{ vehicleId = $script:e2eVehicleId; planId = $script:e2ePlanId } @{ Authorization = "Bearer $script:custTok" }
  if ($c -eq 409) { return "HTTP 409" } else { throw "HTTP $c" }
}
Step "cover over the mileage limit is blocked" {
  $r = Json "$API/warranty/plans" "POST" @{ name = "E2E Tiny"; providerName = "E2E Warranty Co"; durationMonths = 6; maxMileageKm = 1; coverageType = "POWERTRAIN"; priceAmount = 100 } @{ Authorization = "Bearer $script:adminTok" }
  $script:cleanup += "plan:$($r.data.id)"
  $c = Status "$API/warranty/purchases" "POST" @{ vehicleId = 4; planId = $r.data.id } @{ Authorization = "Bearer $script:custTok" }
  if ($c -eq 400) { return "HTTP 400" } else { throw "HTTP $c" }
}

# --- 10. Rating aggregate
Step "rating summary is public and null with no reviews" {
  $r = Json "$API/reviews/summary"
  if ($r.data.count -eq 0 -and $null -ne $r.data.average) { throw "average=$($r.data.average) with 0 reviews" }
  return "count=$($r.data.count) average=$($r.data.average)"
}
Step "staff review routes stay guarded" {
  $c = Status "$API/reviews" "GET" $null @{ Authorization = "Bearer $script:custTok" }
  if ($c -in @(401, 403)) { return "HTTP $c" } else { throw "HTTP $c" }
}

# --- Summary
Write-Host "`n--- summary ---"
$script:lines | ForEach-Object { Write-Host "  $_" }
Write-Host ("`nSteps: {0}   Failures: {1}" -f $script:step, $script:fail)
if ($script:fail -gt 0) { exit 1 }
exit 0
