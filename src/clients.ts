import * as github from '@actions/github'
import { WebClient } from '@slack/web-api'
import { getEnvVariable } from './inputs'

export function getOctoClient() {
  const GITHUB_TOKEN = getEnvVariable('GITHUB_TOKEN')
  return github.getOctokit(GITHUB_TOKEN)
}

export function getSlackClient() {
  const SLACKBOT_TOKEN = getEnvVariable('SLACKBOT_TOKEN')
  return new WebClient(SLACKBOT_TOKEN)
}
