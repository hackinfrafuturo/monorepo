// Only the ALB security group can reach the AWS listener; Serve stays on loopback.
const mode = process.env.INTRANET_AUTH_MODE ?? 'tailscale'
if (!['tailscale', 'tailscale-alb'].includes(mode))
  throw new Error('Unknown authentication mode.')
if (mode === 'tailscale-alb' && !process.env.INTRANET_IDENTITY_URL)
  throw new Error('The private Tailscale identity endpoint is required.')
process.env.NITRO_HOST = mode === 'tailscale-alb' ? '0.0.0.0' : '127.0.0.1'
process.env.HOST = process.env.NITRO_HOST
process.env.NITRO_PORT = process.env.PORT || '3100'
process.env.NODE_ENV = 'production'
if (process.env.INTRANET_DEV_USER)
  throw new Error('Remove INTRANET_DEV_USER before starting production.')
await import('../.output/server/index.mjs')
