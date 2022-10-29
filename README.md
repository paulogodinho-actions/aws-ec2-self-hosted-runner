# aws-ec2-self-hosted-runner

> **WARNING** <br>
This action currently only supports spawning **Windows** machines, Linux is planned and will be added soon. 

This action spawns an [EC2 instance](https://aws.amazon.com/ec2/) on AWS based on a predefined [Launch Template](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html)

All machines are **completely ephemeral** and will cease to exist as soon as a single job is run using them. 

When a Workflow is triggered the following happens in sequence:

1. Broker spawns a machine from Launch Template
2. Unique runner labels are set as the output of the action
3. Newly spawned machine registers itself on GitHub
4. Job can use the unique runner labels to target the new machine
5. Machine terminates itself at the end of the job
6. Machine is auto-de-registered from GitHub

## Action Details
### Inputs
- **GitHub-token**<br>
    GitHub Personal Access Token with the 'repo' scope assigned.
- **aws-region** <br>
    The region to spawn the EC2 machine in. 
- **launch-template-id** <br>
    The Launch Template ID to use when calling `EC2.RunInstances` command. 

### Outputs
- **labels**<br> 
    Labels to be used on `runs-on` parameter of future jobs

Usage Example can be found in [sample-runner-spawn.yml](./.github/workflows/test-runner-spawn.yml)

## Setting up
### Broker
This action requires a pre-set-up agent in EC2 that will spawn an EC2 Instance from a Launch Template and save required data to SSM Parameter Store, we call this agent **broker**.<br>
The broker can be a small machine, like a T2.micro with Amazon Linux 2, the spawn instances AWS CLI takes mere seconds to run, unless you have a high volume of machines to spawn, a single one can handle all your jobs.

Broker Requirements:
- Node LTS
- IAM Role attached that allows for:
    - Run Instances
    - Write to SSM Parameter Store

### Launch Templates
The Launch Templates has no particular requirement outside a proper IAM role, bear in mind that this action uses a **user data** script to make the machine register itself as Github Self Hosted Runner, any previously set **user data** in the Launch Template will be overridden.

Launch Template Requirement:
- IAM Role attached that allows for:
    - Read from SSM Parameter Store


## Future improvements:
- Allow for spawning of Linux machines
- Allow for greater control of Instance life cycle, allowing more jobs to run on a single Instance
