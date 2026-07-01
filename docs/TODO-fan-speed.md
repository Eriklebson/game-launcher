# TODO - Fan Speed Monitoring
# Data: 02/07/2026

## Objetivo
Adicionar leitura de rotação de fans no Monitor de Hardware (monitor.html)
Mostrar: Fan Speed (RPM) + porcentagem de-duty cycle se disponível

## Sensores para coletar

### 1. CPU Fan
- Fonte: LibreHardwareMonitorLib.dll (já integrado)
- SensorType: Fan (RPM)
- Ex: "CPU Fan" → 1200 RPM

### 2. GPU Fan
- Fonte: nvidia-smi (já integrado) - NÃO mostra RPM diretamente
- Alternativa: LibreHardwareMonitorLib.dll → SensorType: Fan
- Ex: "GPU Fan" → 1500 RPM
- NOTA: NVIDIA geralmente mostra duty cycle (%) em vez de RPM
  - nvidia-smi não tem flag para fan RPM
  - LHM pode não expor GPU fan em todas as placas
  - Testar se GTX 1660 SUPER reporta fan sensor

### 3. Case Fans (Chassis)
- Fonte: LibreHardwareMonitorLib.dll
- SensorType: Fan
- Nomes típicos: "System Fan #1", "Chassis Fan", "Case Fan"
- Pode ter múltiplos (Fan #1, #2, #3...)
- Placa-mãe precisa reportar via Super I/O chip

### 4. Water Pump (Opcional)
- Fonte: LibreHardwareMonitorLib.dll
- SensorType: Fan ou Flow
- Nomes: "Pump", "Water Pump", "AIO Pump"
- Pode aparecer como Fan sensor com alta rotação (2000-5000 RPM)

## Implementação

### tools/list-sensors.ps1 (já existe)
- Já lista sensores de Temperatura
- ATUALIZAR para listar também SensorType: Fan, Flow, Control
- Rodar para descobrir quais sensores a máquina do usuário tem

### tools/read-temp.ps1
- Renomear para read-sensors.ps1 (mais genérico)
- Adicionar coleta de Fan sensors além de Temperature
- Output JSON: { cpu: {..., temp: 55}, gpu: {..., temp: 71}, fans: [{ name: "CPU Fan", rpm: 1200 }, ...] }

### src/electron/main.ts
- getCpuTemp() → renomear para getSensors() ou manter separado
- Adicionar IPC handler para fan data
- Incluir fan data no `hardware-stats` event

### src/electron/monitor.html
- Nova seção "Fans" ou adicionar no card de Temperaturas
- Layout: ícone de fan + nome + RPM + duty cycle
- CSS: animação de rotação no ícone (CSS rotate animation)
- Cores: verde (<800), amarelo (800-1500), vermelho (>1500)
- Mostrar "N/A" se sensor não existir

### src/types/index.ts
- Adicionar interface FanData { name: string; rpm: number; duty?: number }

## Limitações conhecidas
- Não todas as placa-mãe reportam fan RPM via Super I/O
- GPUs NVIDIA: fan speed pode não estar disponível via LHM
- Water pumps: pode aparecer como "fan" com RPM muito alto
- Alguns sensores podem precisar de admin (LHM kernel driver)

## Resultado do scan na máquina do usuário
- Placa: ASUS TUF GAMING B550M-PLUS (detectada, mas sem fans sem admin)
- GPU: NVIDIA GeForce GTX 1660 SUPER
  - Fan: 2048 RPM (SensorType: Fan)
  - Duty: 51% (SensorType: Control)
- CPU: AMD Ryzen 7 5800X3D (sem fan sensor exposto)
- Case fans: NÃO detectados (provavelmente precisa de admin/kernel driver)
- Water pump: não encontrado

## Ordem de execução
1. Rodar list-sensors.ps1 atualizado para ver quais sensores existem (JÁ FEITO)
2. Atualizar read-temp.ps1 → read-sensors.ps1 (JÁ FEITO)
3. Atualizar main.ts + preload.ts (JÁ FEITO)
4. Atualizar monitor.html - UI seção Fans (JÁ FEITO)
5. GPU Fan já funciona sem admin (JÁ FEITO)
6. Instalar FanControl para CPU/Case fans (JÁ FEITO - disponível em tools/)

## Status: CONCLUÍDO (com FanControl)
- ✅ list-sensors.ps1 - Atualizado para listar Fan, Flow, Control
- ✅ read-sensors.ps1 - Criaado com suporte a FanControl
- ✅ main.ts - Adicionado FanData interface e coleta
- ✅ monitor.html - Seção de Fans com RPM e animação
- ✅ types/index.ts - Interface FanData adicionada
- ✅ FanControl instalado (portable) em %LOCALAPPDATA%\FanControl

## Próximos passos (opcional)
- [ ] Iniciar FanControl automaticamente com o app
- [ ] Criar ícone no tray para o FanControl
- [ ] Adicionar controle de velocidade (não apenas leitura)
