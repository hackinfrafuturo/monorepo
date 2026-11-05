"use node";

import { createHash, randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { EDIT_LINK_DAYS, LINK_TAG, confirmationEmail, decisionEmail, isTestAddress, messageEmail } from './admin/emailTemplates'

/**
 * Who emails come from, and where replies go. Resend refuses any sender on a domain it hasn't verified,
 * so the sender is a deployment setting: verify the domain first, then set EMAIL_FROM.
 */
const from = () => process.env.EMAIL_FROM ?? 'Infra Futuro <hola@indies.la>'
const replyTo = () => (process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {})

export const sendConfirmation = internalAction({
  args: {
    memberId: v.id('members'),
    name: v.string(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, { memberId, name, email }) => {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not configured')

    const { subject, text, html } = confirmationEmail(name)
    const { error } = await new Resend(key).emails.send(
      { from: from(), to: email, ...replyTo(), subject, text, html },
      { idempotencyKey: `infra-futuro-confirmation/${memberId}` },
    )
    if (error) throw new Error(`Resend could not send confirmation: ${error.message}`)
    return null
  },
})

/**
 * One decision email (convex/admin/decisions.ts). It only goes out where DECISION_EMAILS=send is set on
 * the deployment; anywhere else, and for test addresses, it is recorded as skipped. A decision that
 * changed again before this ran is skipped too, so a team never gets an outdated email.
 */
export const sendDecision = internalAction({
  args: { emailId: v.id('decisionEmails') },
  returns: v.null(),
  handler: async (ctx, { emailId }) => {
    const row = await ctx.runQuery(internal.decisionEmails.load, { emailId })
    if (!row || row.state !== 'queued') return null
    const skip = (error: string) => ctx.runMutation(internal.decisionEmails.mark, { emailId, state: 'skipped', error })
    if (row.current !== row.decision) return void (await skip('The decision changed before sending'))
    if (process.env.DECISION_EMAILS !== 'send') return void (await skip('Decision emails are off on this deployment'))
    if (isTestAddress(row.email)) return void (await skip('Test address'))
    const key = process.env.RESEND_API_KEY
    if (!key) return void (await ctx.runMutation(internal.decisionEmails.mark, { emailId, state: 'failed', error: 'RESEND_API_KEY is not configured' }))

    const { subject, text, html } = decisionEmail(row.decision, row.name)
    const { error } = await new Resend(key).emails.send(
      { from: from(), to: row.email, ...replyTo(), subject, text, html },
      { idempotencyKey: `infra-futuro-decision/${emailId}` },
    )
    await ctx.runMutation(internal.decisionEmails.mark, error ? { emailId, state: 'failed', error: error.message } : { emailId, state: 'sent' })
    return null
  },
})

const SEND_SPACING_MS = 600

/**
 * Works through one custom message a person at a time, then hands itself the next, so a big group stays
 * within Resend's rate and one failure doesn't stop the rest. Only sends where MESSAGE_EMAILS=send; a
 * message that uses {enlace} gets a fresh private link per person, which exists only in that email.
 */
export const sendMessages = internalAction({
  args: { messageId: v.id('messages') },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const next = await ctx.runQuery(internal.messages.nextRecipient, { messageId })
    if (!next) return null
    const { recipientId } = next
    const key = process.env.RESEND_API_KEY
    let delay = 0
    if (process.env.MESSAGE_EMAILS !== 'send') {
      await ctx.runMutation(internal.messages.mark, { recipientId, state: 'skipped', error: 'Custom emails are off on this deployment' })
    } else if (isTestAddress(next.email)) {
      await ctx.runMutation(internal.messages.mark, { recipientId, state: 'skipped', error: 'Test address' })
    } else if (!key || !process.env.EMAIL_REPLY_TO) {
      await ctx.runMutation(internal.messages.mark, { recipientId, state: 'failed', error: 'RESEND_API_KEY or EMAIL_REPLY_TO is not configured' })
    } else {
      delay = SEND_SPACING_MS
      try {
        let link = ''
        if (`${next.subject}\n${next.body}`.includes(LINK_TAG)) {
          const token = randomBytes(32).toString('base64url')
          await ctx.runMutation(internal.applicationEdits.createLink, {
            memberId: next.memberId,
            tokenHash: createHash('sha256').update(token).digest('hex'),
            expiresAt: Date.now() + EDIT_LINK_DAYS * 86_400_000,
            createdBy: next.actor,
          })
          link = `${process.env.SITE_URL ?? 'https://hackinfrafuturo.cl'}/corregir#${token}`
        }
        const { subject, text, html } = messageEmail(next.subject, next.body, next.name, link)
        const { error } = await new Resend(key).emails.send(
          { from: from(), to: next.email, ...replyTo(), subject, text, html },
          { idempotencyKey: `infra-futuro-message/${recipientId}` },
        )
        await ctx.runMutation(internal.messages.mark, error ? { recipientId, state: 'failed', error: error.message } : { recipientId, state: 'sent' })
      } catch (error) {
        await ctx.runMutation(internal.messages.mark, { recipientId, state: 'failed', error: String(error) })
      }
    }
    await ctx.scheduler.runAfter(delay, internal.emails.sendMessages, { messageId })
    return null
  },
})
