import { CONTACT, SITE } from '@/lib/site'
import type { Lang } from '@/lib/types'
import { ContactForm } from './ContactForm'

/** /contact.html on both templates: contact details and the message form. */
export function ContactSection({ lang, title }: { lang: Lang; title: string }) {
  const t = SITE[lang].contact
  return (
    <article className="static-page contact-page">
      <h1>{title}</h1>
      <p className="contact-intro">{t.intro}</p>
      <ul className="contact-list">
        <li>
          <span>{t.emailLabel}</span>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </li>
        <li>
          <span>{t.phoneLabel}</span>
          <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
        </li>
        <li>
          <span>{t.addressLabel}</span>
          {t.address}
        </li>
      </ul>
      <h2>{t.formTitle}</h2>
      <ContactForm lang={lang} />
    </article>
  )
}
