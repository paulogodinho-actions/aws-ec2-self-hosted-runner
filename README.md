# aws-ec2-self-hosted-runner

> **WARNING** <br>
This action currently only supports spawning **Windows** machines, Linux is planned and will be added soon. 

This actions spawns an [EC2 instance](https://aws.amazon.com/ec2/) on AWS based on a predefined [Launch Template](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html)

### Inputs
- **github-token**<br>
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
This action requires a pre set up agent in EC2 that will spawn an EC2 Instance from a Launch Template and save required data to SSM Paramenter Store, we call this agent **broker**.<br>
The broker can be a small machine, like a T2.micro with Amazon Linux 2, the spawn instances aws cli takes mere seconds to run, unless you have a high volume of machines to spawn, a single one can handle all your jobs.

Broker Requirements:
- Node LTS
- IAM Role attached that allows for:
    - Run Instances
    - Write to SSM Parameter Store

### Launch Templates
The Launch Templates has no special requirement outside a proper IAM role, bear in mind that this action uses an **user data** script to make the machine register itself as Github Self Hosted Runner, any previously set **user data** in the Launch Template will be overriden.

Launch Template Requirement:
- IAM Role attached that allows for:
    - Read from SSM Parameter Store
