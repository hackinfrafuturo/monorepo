import { createFileRoute, redirect } from '@tanstack/react-router'
import { SPONSOR } from '../i18n/locale'

export const Route = createFileRoute('/sponsor')({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `${SPONSOR}${location.searchStr}`,
      statusCode: 301,
      reloadDocument: true,
    })
  },
})
