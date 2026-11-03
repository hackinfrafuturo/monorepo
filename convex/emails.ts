"use node";

import { createHash, randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { EDIT_LINK_DAYS, LINK_TAG, decisionEmail, isTestAddress, messageEmail } from './admin/emailTemplates'

const FROM = 'Infra Futuro <hola@indies.la>'
const SUBJECT = 'Recibimos tu postulación · Infra Futuro 2026'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      default: return '&#39;'
    }
  })
}

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

    const { error } = await new Resend(key).emails.send(
      {
        from: FROM,
        to: email,
        subject: SUBJECT,
        html: `<main style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:Arial,sans-serif;color:#20201e;line-height:1.6"><p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase">infra futuro 2026</p><p>hi ${escapeHtml(name)},</p><p>we received your application for infra futuro 2026.</p><p>nos comunicaremos a la brevedad.</p><p>nos vemos el 5 y 6 de diciembre, santiago.</p></main>`,
        text: `hi ${name},\n\nwe received your application for infra futuro 2026.\n\nnos comunicaremos a la brevedad.\n\nnos vemos el 5 y 6 de diciembre, santiago.`,
      },
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
      { from: FROM, to: row.email, ...(process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {}), subject, text, html },
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
    const replyTo = process.env.EMAIL_REPLY_TO
    const key = process.env.RESEND_API_KEY
    let delay = 0
    if (process.env.MESSAGE_EMAILS !== 'send') {
      await ctx.runMutation(internal.messages.mark, { recipientId, state: 'skipped', error: 'Custom emails are off on this deployment' })
    } else if (isTestAddress(next.email)) {
      await ctx.runMutation(internal.messages.mark, { recipientId, state: 'skipped', error: 'Test address' })
    } else if (!key || !replyTo) {
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
          { from: FROM, to: next.email, replyTo, subject, text, html },
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
