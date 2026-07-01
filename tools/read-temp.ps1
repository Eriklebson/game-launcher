# read-temp.ps1 - Reads CPU/GPU temperature via LibreHardwareMonitorLib.dll
# GPU temp works without admin (NVAPI). CPU temp needs admin for AMD SMU.
# Usage: powershell -ExecutionPolicy Bypass -File read-temp.ps1 [-Elevated]
# With -Elevated: writes result to temp file and exits (for elevated subprocess)
# Without -Elevated: reads temp file if available, otherwise tries direct read
# Outputs JSON: {"cpu":{"name":"...","temp":55},"gpu":{"name":"...","temp":71}}

param([switch]$Elevated)

$dllDir = Join-Path $PSScriptRoot "LibreHardwareMonitor"
$dllPath = Join-Path $dllDir "LibreHardwareMonitorLib.dll"
$outFile = Join-Path $env:TEMP "lhm-temp-cache.json"

if (-not (Test-Path $dllPath)) {
    Write-Output '{"cpu":null,"gpu":null}'
    exit 0
}

try {
    Add-Type -Path $dllPath -ErrorAction Stop
} catch {
    Write-Output '{"cpu":null,"gpu":null}'
    exit 0
}

function Read-Sensors {
    $computer = New-Object LibreHardwareMonitor.Hardware.Computer
    $computer.IsCpuEnabled = $true
    $computer.IsGpuEnabled = $true

    try {
        $computer.Open()
    } catch {
        return @{ cpu = $null; gpu = $null }
    }

    $cpuName = ""
    $cpuTemp = 0
    $gpuName = ""
    $gpuTemp = $null

    foreach ($hardware in $computer.Hardware) {
        $hardware.Update()
        foreach ($sub in $hardware.SubHardware) { $sub.Update() }

        if ($hardware.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::Cpu) {
            $cpuName = $hardware.Name
            foreach ($sensor in $hardware.Sensors) {
                if ($sensor.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $sensor.Value -ne $null) {
                    $v = [double]$sensor.Value
                    if ($v -gt $cpuTemp) { $cpuTemp = $v }
                }
            }
        }

        $isGpu = ($hardware.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::GpuNvidia) -or
                 ($hardware.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::GpuAmd) -or
                 ($hardware.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::GpuIntel)
        if ($isGpu) {
            $gpuName = $hardware.Name
            foreach ($sensor in $hardware.Sensors) {
                if ($sensor.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $sensor.Value -ne $null) {
                    $v = [double]$sensor.Value
                    if ($v -gt 0 -and ($gpuTemp -eq $null -or $v -gt $gpuTemp)) { $gpuTemp = [math]::Round($v) }
                }
            }
        }
    }

    $computer.Close()
    return @{ cpu = @{ name = $cpuName; temp = if ($cpuTemp -gt 0) { [math]::Round($cpuTemp) } else { 0 } }; gpu = @{ name = $gpuName; temp = $gpuTemp } }
}

# If elevated, read sensors and write to cache file
if ($Elevated) {
    $result = Read-Sensors
    $output = [PSCustomObject]@{
        cpu = if ($result.cpu.name -and $result.cpu.temp -gt 0) { [PSCustomObject]@{ name = $result.cpu.name; temp = $result.cpu.temp } } else { $null }
        gpu = if ($result.gpu.name -and $result.gpu.temp -gt 0) { [PSCustomObject]@{ name = $result.gpu.name; temp = $result.gpu.temp } } else { $null }
    }
    $output | ConvertTo-Json -Compress | Set-Content -Path $outFile -NoNewline -ErrorAction SilentlyContinue
    exit 0
}

# Not elevated: try direct read first (GPU works, CPU may be 0 on AMD)
$result = Read-Sensors

# If CPU temp is 0 and we have a cached result from a previous elevation, use it
if ($result.cpu.temp -eq 0 -and (Test-Path $outFile)) {
    try {
        $cached = Get-Content $outFile -Raw | ConvertFrom-Json
        if ($cached.cpu -and $cached.cpu.temp -gt 0) {
            $result.cpu = @{ name = $cached.cpu.name; temp = $cached.cpu.temp }
        }
    } catch {}
}

$output = [PSCustomObject]@{
    cpu = if ($result.cpu.name -and $result.cpu.temp -gt 0) { [PSCustomObject]@{ name = $result.cpu.name; temp = $result.cpu.temp } } else { $null }
    gpu = if ($result.gpu.name -and $result.gpu.temp -gt 0) { [PSCustomObject]@{ name = $result.gpu.name; temp = $result.gpu.temp } } else { $null }
}

Write-Output ($output | ConvertTo-Json -Compress)
