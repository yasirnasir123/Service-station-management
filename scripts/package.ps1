# Run from the project root; includes only an explicit source allowlist.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$zipPath = Join-Path $projectRoot 'Service-Station-Management-50-percent.zip'
$stream = [IO.File]::Open($zipPath, [IO.FileMode]::Create)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    $files = @()
    foreach ($folder in @('backend','frontend','database','docs','scripts')) {
        $files += Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -Recurse -File
    }
    foreach ($name in @('README.md','package.json','package-lock.json','.env.example','.gitignore')) {
        $files += Get-Item -LiteralPath (Join-Path $projectRoot $name)
    }
    foreach ($file in $files) {
        $entry = $file.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$entry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose(); $stream.Dispose() }
$check = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    if ($check.Entries.FullName -match '(^|/)(node_modules|\.env|\.git)(/|$)') { throw 'Unexpected private/generated content in archive' }
    Write-Output "Verified $($check.Entries.Count) source entries: $zipPath"
} finally { $check.Dispose() }
Get-FileHash -LiteralPath $zipPath -Algorithm SHA256

