//@ts-check
const core = require('@actions/core');
const github = require('@actions/github');
const SSM = require("@aws-sdk/client-ssm");
const EC2 = require("@aws-sdk/client-ec2");
const { promises: fs } = require('fs')
require('path')

const aws_region = core.getInput('aws-region')
core.info(`Region: ${aws_region}`)

const SSMClient = new SSM.SSMClient({region: aws_region});
const EC2Client = new EC2.EC2Client({region: aws_region});

let instanceId = '';

async function run() {
  try {

    let userData = null;

    if(core.getInput('user-data')) {
      const windows_user_data_path = core.getInput('user-data');
      const userDataFile = await fs.readFile(windows_user_data_path, 'utf8');
      const userDataAsB64 = Buffer.from(userDataFile).toString('base64');
      userData = userDataAsB64
    }

    const repoUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}`;
    const token = await getRegistrationToken();
    const launchTemplateId = core.getInput('launch-template-id');

    core.info(`Working on region ${aws_region}`);
    core.info(`Repository ${repoUrl}`);
    core.info(`Template to Spawn: ${launchTemplateId}`);
    core.info("Spawning EC2 Instance");

    try {
      const runInstancesCommand = new EC2.RunInstancesCommand({
        MinCount: 1,
        MaxCount: 1,
        UserData: userData ? userData : "",
        LaunchTemplate: {
          LaunchTemplateId: launchTemplateId
        }
      });
      const response = await EC2Client.send(runInstancesCommand);

      if(response.Instances == undefined) {
        throw 'No InstanceId defined for Instance';
      }
      if (response.Instances.length != 1) {
        throw `Only one Instance Expected, found: ${response.Instances.length}`
      }

      // @ts-ignore
      instanceId = response.Instances[0].InstanceId;

    } catch (error) {
      core.error(`Failed to spawn machine with RunInstancesCommand, LaunchTemplateId: ${launchTemplateId}`);
      throw error
    }

    await PutSSMParameter(`${instanceId}_UniqueRunId`, instanceId);
    await PutSSMParameter(`${instanceId}_RepositoryUrl`, repoUrl);
    await PutSSMParameter(`${instanceId}_AgentToken`, token);

    const labels = ["self-hosted", `${instanceId}`];
    const toSetAsOutput = JSON.stringify(labels);
    core.info(`Labels: ${toSetAsOutput}`);

    core.setOutput('labels', toSetAsOutput);
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function PutSSMParameter(name, value) {
  try {
    const putParameterCmd = new SSM.PutParameterCommand({ Name: name, Value: value, Type: "String" })
    const ssmResponse = await SSMClient.send(putParameterCmd);
    core.info(`SSM Status Code for ${name}: ${ssmResponse.$metadata.httpStatusCode}`)
  } catch (error) {
    core.error(`Not able to set SSM Parameter with Name: ${name}`);
    throw error
  }
}

async function getRegistrationToken() {
  const octokit = github.getOctokit(core.getInput('github-token'));

  try {
    const githubContext = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
    };

    const response = await octokit.request('POST /repos/{owner}/{repo}/actions/runners/registration-token', githubContext);
    core.info('GitHub Registration Token is received');
    return response.data.token;
  } catch (error) {
    core.error('GitHub Registration Token receiving error');
    throw error;
  }
}

// There is no need for a cleanup
// async function cleanup() {
//   try {
//     core.info("Starting Post");
//     if(instanceId != '') {
//       const deleteParameterCommand = new SSM.DeleteParametersCommand( { Names: [`${instanceId}_UniqueRunId`, `${instanceId}_RepositoryUrl`, `${instanceId}_AgentToken`]})
//       await SSMClient.send(deleteParameterCommand);
//     }
//   } catch (error) {
//     core.error(error.message)
//   }
// }

// // Main
// if (!!core.getState('isPost') == false) {
//   run()
// }
// // Post
// else {
//   cleanup()
// }

run();
