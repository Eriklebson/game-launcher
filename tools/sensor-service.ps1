# sensor-service.ps1 - Runs elevated in background, writes sensor data every 3 seconds
# Started by main.ts when monitor opens, killed when monitor closes
# Writes to: %TEMP%\lhm-sensors-cache.json

$dllDir = Join-Path $PSScriptRoot "LibreHardwareMonitor"
$dllPath = Join-Path $dllDir "LibreHardwareMonitorLib.dll"
$outFile = Join-Path $env:TEMP "lhm-sensors-cache.json"
$stopFile = Join-Path $env:TEMP "lhm-sensor-service.stop"

# ASUS TUF GAMING B550M-PLUS fan channel mapping (confirmed via Armoury Crate)
$FanNameMap = @{
    "Fan #1" = "Cha_1"
    "Fan #2" = "CPU"
    "Fan #3" = "Cha_2"
    "Fan #4" = "Cha_3"
    "Fan #5" = "AIO"
    "Fan #6" = "Bomba WC"
    "Fan #7" = "Bomba WC"
}

# Remove stop file on start
Remove-Item -Path $stopFile -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $dllPath)) { exit 1 }
try { Add-Type -Path $dllPath -ErrorAction Stop } catch { exit 1 }

function Read-AllSensors {
    $computer = New-Object LibreHardwareMonitor.Hardware.Computer
    $computer.IsMotherboardEnabled = $true
    $computer.IsCpuEnabled = $true
    $computer.IsGpuEnabled = $true
    try { $computer.Open() } catch { return $null }

    $cpuName = ""; $cpuTemp = 0; $cpuPackageTemp = 0
    $gpuName = ""; $gpuTemp = $null
    $fans = @()

    foreach ($hw in $computer.Hardware) {
        $hw.Update()
        foreach ($sub in $hw.SubHardware) { $sub.Update() }

        if ($hw.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::Cpu) {
            $cpuName = $hw.Name
            foreach ($s in $hw.Sensors) {
                if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $s.Value -ne $null) {
                    $v = [double]$s.Value
                    # CCD1 (Tdie) - actual die temperature (lower)
                    if ($s.Name -match "^CCD\d") {
                        if ($v -gt $cpuTemp) { $cpuTemp = $v }
                    }
                    # Core (Tctl/Tdie) - package/thermal limit temperature (higher)
                    if ($s.Name -match "^Core") {
                        if ($v -gt $cpuPackageTemp) { $cpuPackageTemp = $v }
                    }
                }
            }
        }

        $isGpu = ($hw.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::GpuNvidia) -or
                 ($hw.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::GpuAmd) -or
                 ($hw.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::GpuIntel)
        if ($isGpu) {
            $gpuName = $hw.Name
            foreach ($s in $hw.Sensors) {
                if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $s.Value -ne $null) {
                    $v = [double]$s.Value
                    if ($v -gt 0 -and ($gpuTemp -eq $null -or $v -gt $gpuTemp)) { $gpuTemp = [math]::Round($v) }
                }
            }
            foreach ($s in $hw.Sensors) {
                if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Fan -and $s.Value -ne $null) {
                    $rpm = [math]::Round([double]$s.Value)
                    if ($rpm -gt 0) { $fans += @{ name = "GPU Fan"; rpm = $rpm; hardware = "GPU" } }
                }
            }
            foreach ($s in $hw.Sensors) {
                if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Control -and $s.Value -ne $null) {
                    $duty = [math]::Round([double]$s.Value)
                    for ($i = 0; $i -lt $fans.Count; $i++) {
                        if ($fans[$i].hardware -eq "GPU") { $fans[$i].duty = $duty; break }
                    }
                }
            }
        }

        foreach ($sub in $hw.SubHardware) {
            $subFans = @()
            foreach ($s in $sub.Sensors) {
                if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Fan -and $s.Value -ne $null) {
                    $rpm = [math]::Round([double]$s.Value)
                    $name = if ($FanNameMap.ContainsKey($s.Name)) { $FanNameMap[$s.Name] } else { $s.Name }
                    $subFans += @{ name = $name; rpm = $rpm; rawName = $s.Name }
                }
            }
            foreach ($s in $sub.Sensors) {
                if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Control -and $s.Value -ne $null) {
                    $duty = [math]::Round([double]$s.Value)
                    for ($i = 0; $i -lt $subFans.Count; $i++) {
                        if ($subFans[$i].rawName -eq $s.Name) { $subFans[$i].duty = $duty; break }
                    }
                }
            }
            foreach ($f in $subFans) {
                if ($f.rpm -gt 0) {
                    $fans += @{ name = $f.name; rpm = $f.rpm; duty = $f.duty; hardware = "Motherboard" }
                }
            }
        }
    }

    # Deduplicate: if two fans have same name, keep the one with higher RPM
    $deduped = @()
    $seenNames = @{}
    foreach ($f in $fans) {
        if ($seenNames.ContainsKey($f.name)) {
            if ($f.rpm -gt $seenNames[$f.name].rpm) {
                $deduped = $deduped | Where-Object { $_.name -ne $f.name }
                $deduped += $f
                $seenNames[$f.name] = $f
            }
        } else {
            $deduped += $f
            $seenNames[$f.name] = $f
        }
    }
    $fans = $deduped

    $computer.Close()
    return @{
        cpu = if ($cpuName -and $cpuTemp -gt 0) { @{ name = $cpuName; temp = [math]::Round($cpuTemp); packageTemp = [math]::Round($cpuPackageTemp) } } else { $null }
        gpu = if ($gpuName -and $gpuTemp -gt 0) { @{ name = $gpuName; temp = $gpuTemp } } else { $null }
        fans = $fans
    }
}

# Main loop - read sensors every 3 seconds
while ($true) {
    if (Test-Path $stopFile) { break }

    $result = Read-AllSensors
    if ($result) {
        $output = [PSCustomObject]@{
            cpu = $result.cpu
            gpu = $result.gpu
            fans = $result.fans
        }
        $output | ConvertTo-Json -Compress -Depth 5 | Set-Content -Path $outFile -NoNewline -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 3

    if (Test-Path $stopFile) { break }
}

# Cleanup
Remove-Item -Path $stopFile -Force -ErrorAction SilentlyContinue
