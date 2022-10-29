<powershell>
# Install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install AWS CLI
choco install awscli -y

# Refresh Path
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")

# TODO: Get InstanceId http://169.254.169.254/latest/meta-data/instance-id
$instanceId = (Invoke-WebRequest http://169.254.169.254/latest/meta-data/instance-id -UseBasicParsing).Content

# Get ID from SSM
Write-Output 'SSM Get Parameter Calls'
$uniqueRunIdParamName = "$($instanceId)_UniqueRunId"
$ssmCallResponse = (aws ssm get-parameter --name $uniqueRunIdParamName) | Out-String
Write-Output "$uniqueRunIdParamName : $ssmCallResponse"
$ssmGetParameterResponse = ConvertFrom-Json $ssmCallResponse
$uniqueRunId = $ssmGetParameterResponse.Parameter.Value

# Get Repository URL from SSM
$repositoryUrlParamName = "$($instanceId)_RepositoryUrl"
$ssmCallResponse = (aws ssm get-parameter --name $repositoryUrlParamName) | Out-String
Write-Output "$repositoryUrlParamName : $ssmCallResponse"
$ssmGetParameterResponse = ConvertFrom-Json $ssmCallResponse
$repositoryUrl = $ssmGetParameterResponse.Parameter.Value

# Get Github Agent Token from SSM
$agentTokenParamName = "$($instanceId)_AgentToken"
$ssmCallResponse = (aws ssm get-parameter --name $agentTokenParamName) | Out-String
Write-Output "$agentTokenParamName : $ssmCallResponse"
$ssmGetParameterResponse = ConvertFrom-Json $ssmCallResponse
$agentToken = $ssmGetParameterResponse.Parameter.Value

# Cleanup SSM Parameters
aws ssm delete-parameter --name $uniqueRunIdParamName
aws ssm delete-parameter --name $repositoryUrlParamName
aws ssm delete-parameter --name $agentTokenParamName

Set-Location C:/

# Setup JOB_COMPLETED Env TODO: Make Time to live Customizable
Set-Content -Value 'shutdown -s -t 10' -Path ./shutdown.ps1 -Force

# Create Runner Folder
New-Item -Path ./actions-runner -ItemType Directory 
Set-Location actions-runner

# Setup Runner .env file
Set-Content -Value 'ACTIONS_RUNNER_HOOK_JOB_COMPLETED=C:\shutdown.ps1' -Path './.env' -Force

# Download GitHub Runner 
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.296.1/actions-runner-win-x64-2.296.1.zip -OutFile actions-runner-win-x64-2.296.1.zip
if((Get-FileHash -Path actions-runner-win-x64-2.296.1.zip -Algorithm SHA256).Hash.ToUpper() -ne '270e0cd0b7371030bf39ebfbe9ab47721932b4596635d258dc5ab002815113db'.ToUpper()){ throw 'Computed checksum did not match' }
Add-Type -AssemblyName System.IO.Compression.FileSystem ; [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.296.1.zip", "$PWD")

# Configure Runner
./config.cmd --url "$repositoryUrl" --token "$agentToken" --labels "$uniqueRunId" --unattended --ephemeral 

# Execure Runner on a separated process
Start-Process .\run.cmd

</powershell>