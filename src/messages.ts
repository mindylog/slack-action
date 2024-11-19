import * as github from '@actions/github'
import { Bits, Blocks, Md, Message, SlackMessageDto } from 'slack-block-builder'
import { dedent } from 'ts-dedent'
import { P, match } from 'ts-pattern'
import { z } from 'zod'
import { COLORS, NONEXSISTANT_SHA } from './constants'
import { InputSchema } from './inputs'
import { getOctoClient } from './clients'

export async function createThreadMainMessageSurface(
  inputs: z.infer<typeof InputSchema>
): Promise<SlackMessageDto> {
  const commitMessages = await getAssociatedCommitMessages(inputs.before_ref)

  const message = Message({
    channel: inputs.channel_id,
    text: match(inputs.phase)
      .with('start', () => '배포 진행중 :githubloading:')
      .with('finish', () => '배포 완료 :approved_github:')
      .with('failure', () => '배포 실패 :github-closed:')
      .with('cancelled', () => '배포 취소 :github-closed:')
      .otherwise(() => ''),
    ts: match(inputs)
      .with(
        { phase: P.union('finish', 'failure', 'cancelled') },
        ({ thread_ts }) => thread_ts
      )
      .otherwise(() => undefined)
  })
    .blocks(
      Blocks.Divider(),
      Blocks.Section({
        text: dedent`
          ${Md.group(inputs.group_id)}
          ${Md.listBullet(commitMessages)}
          `
      })
    )
    .attachments(
      Bits.Attachment({
        color: match(inputs.phase)
          .with('start', () => COLORS.PENDING)
          .with('finish', () => COLORS.SUCCESS)
          .with('failure', () => COLORS.FAILURE)
          .with('cancelled', () => COLORS.CANCEL)
          .otherwise(() => COLORS.CANCEL)
      }).blocks(
        Blocks.Section({
          text: dedent`
          서비스 : ${inputs.service_name}
          배포 환경 : ${inputs.environment}
          Run ID : ${createGithubRunLink()}
          진행 상태 : ${match(inputs.phase)
            .with('start', () => '배포 진행중 :githubloading:')
            .with('finish', () => '배포 완료 :approved_github:')
            .with('failure', () => '배포 실패 :github-closed:')
            .with('cancelled', () => '배포 취소 :github-closed:')
            .otherwise(() => '')}
          `
        })
      )
    )
    .buildToObject()

  return message
}

function createGithubRunLink() {
  return Md.link(
    `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`,
    String(github.context.runId)
  )
}


async function getAssociatedCommitMessages(
  beforeRef: string
): Promise<string[]> {
  const octoClient = getOctoClient()

  const baseRef = await commitShaOrReleaseTag(beforeRef)
  const headRef = github.context.sha

  const associatedCommits =
    await octoClient.rest.repos.compareCommitsWithBasehead({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      basehead: `${baseRef}...${headRef}`
    })
  return [
    ...new Set(
      associatedCommits.data.commits.map(commit => commit.commit.message)
    )
  ]
}

async function getPreviousRelease() {
  const octoClient = getOctoClient()

  const latestTwoReleases = await octoClient.rest.repos.listReleases({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    per_page: 2
  })

  const previousRelease = latestTwoReleases?.data.at(-1)
  if (!previousRelease) {
    throw new Error('No previous release found')
  }
  return previousRelease
}

async function commitShaOrReleaseTag(beforeRef: string): Promise<string> {
  return isExistingSha(beforeRef)
    ? beforeRef
    : (await getPreviousRelease()).tag_name
}

function isExistingSha(sha: string) {
  return sha !== NONEXSISTANT_SHA
}


