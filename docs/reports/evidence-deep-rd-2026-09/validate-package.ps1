$ErrorActionPreference = 'Stop'

$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$claimPath = Join-Path $packageRoot 'research-claim-ledger.csv'
$casePath = Join-Path $packageRoot 'evaluation-case-catalogue.csv'
$competitorPath = Join-Path $packageRoot 'competitor-evidence-ledger.csv'
$marketPath = Join-Path $packageRoot 'market-priority-evidence-matrix.csv'
$chainPath = Join-Path $packageRoot 'jurisdiction-source-chain-matrix.csv'
$expertPath = Join-Path $packageRoot 'jurisdiction-expert-review-register.csv'

$claims = @(Import-Csv -LiteralPath $claimPath)
$cases = @(Import-Csv -LiteralPath $casePath)
$competitors = @(Import-Csv -LiteralPath $competitorPath)
$markets = @(Import-Csv -LiteralPath $marketPath)
$chains = @(Import-Csv -LiteralPath $chainPath)
$expertReviews = @(Import-Csv -LiteralPath $expertPath)
$errors = [System.Collections.Generic.List[string]]::new()

function Test-RequiredFields($rows, $name) {
    foreach ($row in $rows) {
        foreach ($property in $row.PSObject.Properties) {
            if ([string]::IsNullOrWhiteSpace([string]$property.Value)) {
                $errors.Add("$name has an empty $($property.Name) field")
            }
        }
    }
}

Test-RequiredFields $claims 'claim ledger'
Test-RequiredFields $cases 'evaluation catalogue'
Test-RequiredFields $competitors 'competitor ledger'
Test-RequiredFields $markets 'market matrix'
Test-RequiredFields $chains 'jurisdiction source-chain matrix'
Test-RequiredFields $expertReviews 'jurisdiction expert-review register'

foreach ($group in @($claims | Group-Object claim_id | Where-Object Count -gt 1)) {
    $errors.Add("duplicate claim_id: $($group.Name)")
}
foreach ($group in @($cases | Group-Object case_id | Where-Object Count -gt 1)) {
    $errors.Add("duplicate case_id: $($group.Name)")
}

$knownClaims = @{}
foreach ($claim in $claims) {
    $knownClaims[$claim.claim_id] = $true
    if ($claim.primary_source -notmatch '^https://') {
        $errors.Add("claim $($claim.claim_id) lacks an HTTPS primary_source")
    }
    if ($claim.confidence -notin @('high', 'medium', 'low')) {
        $errors.Add("claim $($claim.claim_id) has invalid confidence")
    }
}

foreach ($case in $cases) {
    foreach ($claimId in ($case.required_claims -split '\|')) {
        if ($claimId -ne 'none' -and -not $knownClaims.ContainsKey($claimId)) {
            $errors.Add("case $($case.case_id) references missing claim $claimId")
        }
    }
}

$expectedMarkets = @(
    'Austria', 'Belgium', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France',
    'Germany', 'Ireland', 'Italy', 'Lithuania', 'Luxembourg', 'Netherlands',
    'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'United Kingdom'
)
$actualMarkets = @($markets.market | Sort-Object -Unique)
foreach ($market in $expectedMarkets) {
    if ($market -notin $actualMarkets) { $errors.Add("market matrix missing $market") }
}
if ($actualMarkets.Count -ne 20) {
    $errors.Add("market matrix has $($actualMarkets.Count) unique markets, expected 20")
}

$actualChainMarkets = @($chains.market | Sort-Object -Unique)
foreach ($market in $expectedMarkets) {
    if ($market -notin $actualChainMarkets) { $errors.Add("jurisdiction source-chain matrix missing $market") }
}
if ($actualChainMarkets.Count -ne 20) {
    $errors.Add("jurisdiction source-chain matrix has $($actualChainMarkets.Count) unique markets, expected 20")
}
$actualExpertMarkets = @($expertReviews.market | Sort-Object -Unique)
foreach ($market in $expectedMarkets) {
    if ($market -notin $actualExpertMarkets) { $errors.Add("jurisdiction expert-review register missing $market") }
}
if ($actualExpertMarkets.Count -ne 20) {
    $errors.Add("jurisdiction expert-review register has $($actualExpertMarkets.Count) unique markets, expected 20")
}
foreach ($review in $expertReviews) {
    if ($review.status -notin @('pending_external_review', 'approved', 'approved_with_conditions', 'rejected', 'withdrawn')) {
        $errors.Add("expert review $($review.market) has invalid status $($review.status)")
    }
}
foreach ($chain in $chains) {
    foreach ($field in @('law_claim_ids', 'administrative_claim_ids', 'amount_or_statistic_claim_ids', 'mutable_register_or_list_claim_ids', 'supersession_claim_ids')) {
        foreach ($claimId in ($chain.$field -split '\|')) {
            if ($claimId -ne 'none' -and -not $knownClaims.ContainsKey($claimId)) {
                $errors.Add("source chain $($chain.market) field $field references missing claim $claimId")
            }
        }
    }
}

$missingLinks = [System.Collections.Generic.List[string]]::new()
foreach ($file in Get-ChildItem -LiteralPath $packageRoot -Filter '*.md') {
    $content = Get-Content -Raw -Encoding utf8 -LiteralPath $file.FullName
    foreach ($match in [regex]::Matches($content, '\[[^\]]+\]\((?!https?://|#)([^)]+)\)')) {
        $relative = $match.Groups[1].Value.Split('#')[0]
        if ($relative -and -not (Test-Path -LiteralPath (Join-Path $packageRoot $relative))) {
            $missingLinks.Add("$($file.Name) -> $relative")
        }
    }
}
foreach ($link in $missingLinks) { $errors.Add("missing local link: $link") }

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output "PASS claims=$($claims.Count) cases=$($cases.Count) competitors=$($competitors.Count) markets=$($actualMarkets.Count) sourceChains=$($actualChainMarkets.Count) expertPackets=$($actualExpertMarkets.Count)"
