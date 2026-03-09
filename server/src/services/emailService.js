const { sendEmail } = require('../lib/mailer');

const WEBSITE_URL = 'https://mybarber.app';
const SUPPORT_EMAIL = 'support@mybarber.app';
const YEAR = new Date().getFullYear();

const CLIENT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1400&q=80';
const BARBER_HERO_IMAGE =
  'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1400&q=80';
const BOOKING_HERO_IMAGE =
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHtmlTemplate = ({
  preheader,
  title,
  subtitle,
  heroImageUrl,
  greeting,
  intro,
  roleLabel,
  safeName,
  safeEmail,
  nextSteps,
  ctaLabel,
}) => `
  <!doctype html>
  <html lang="it">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background:#120d09; font-family:Arial, sans-serif;">
      <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">
        ${preheader}
      </span>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#120d09; padding:30px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; border:1px solid #5f4322; border-radius:14px; overflow:hidden; background:#f7f1e8;">
              <tr>
                <td style="background:#17120e; border-bottom:1px solid #7e5a2f; padding:18px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="font-family:Georgia, 'Times New Roman', serif; color:#e4c089; font-size:36px; letter-spacing:1px; font-weight:700;">
                        MY BARBER
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top:6px; color:#c7ab81; font-size:12px; letter-spacing:2px; text-transform:uppercase;">
                        ${subtitle}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0;">
                  <img src="${heroImageUrl}" alt="My Barber" width="640" style="display:block; width:100%; max-width:640px; height:auto; border:0;" />
                </td>
              </tr>

              <tr>
                <td style="padding:24px 28px 10px; color:#2e251c;">
                  <p style="margin:0 0 10px; font-family:Georgia, 'Times New Roman', serif; font-size:37px; line-height:1.1;">
                    ${title}
                  </p>
                  <p style="margin:0 0 12px; font-size:17px; line-height:1.7;">
                    ${greeting}
                  </p>
                  <p style="margin:0 0 14px; font-size:17px; line-height:1.7;">
                    ${intro}
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 28px 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf6ee; border:1px solid #d0b48a; border-radius:8px;">
                    <tr>
                      <td style="padding:13px 14px; border-bottom:1px solid #e1d0b4; font-size:16px; color:#2f271e;">
                        <strong>Nome:</strong> ${safeName}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 14px; border-bottom:1px solid #e1d0b4; font-size:16px; color:#2f271e;">
                        <strong>Email:</strong> ${safeEmail}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 14px; font-size:16px; color:#2f271e;">
                        <strong>Ruolo:</strong> ${roleLabel}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 28px 8px; color:#2f271e;">
                  <p style="margin:0 0 8px; font-family:Georgia, 'Times New Roman', serif; font-size:24px; line-height:1.3;">
                    Prossimi passi
                  </p>
                  ${nextSteps
                    .map(
                      (step, index) =>
                        `<p style="margin:0 0 8px; font-size:16px; line-height:1.7;">${index + 1}) ${step}</p>`
                    )
                    .join('')}
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:12px 28px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td style="background:#16110d; border:1px solid #a57b43; border-radius:8px;">
                        <a href="${WEBSITE_URL}" style="display:inline-block; padding:14px 30px; color:#f4e3c8; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:700; text-decoration:none;">
                          ${ctaLabel}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 28px 20px; color:#2f271e;">
                  <p style="margin:0 0 8px; font-size:16px; line-height:1.7;">
                    Hai domande? Scrivici a
                    <a href="mailto:${SUPPORT_EMAIL}" style="color:#2f271e; font-weight:700; text-decoration:underline;">${SUPPORT_EMAIL}</a>.
                  </p>
                  <p style="margin:0; font-size:16px; line-height:1.7;">
                    Grazie per esserti registrato. <br />
                    <strong>Il Team My Barber</strong>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background:#17120e; border-top:1px solid #7e5a2f; padding:14px 18px;">
                  <p style="margin:0; text-align:center; color:#d6b987; font-size:13px; line-height:1.7;">
                    Seguici su
                    <a href="https://www.instagram.com" style="color:#d6b987; text-decoration:none;">Instagram</a>
                    e
                    <a href="https://www.facebook.com" style="color:#d6b987; text-decoration:none;">Facebook</a>
                  </p>
                  <p style="margin:6px 0 0; text-align:center; color:#b38e59; font-size:12px; line-height:1.7;">
                    &copy; ${YEAR} My Barber
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const buildClientWelcomeEmail = ({ safeName, safeEmail }) => {
  const title = 'Benvenuto in My Barber';
  const roleLabel = 'Cliente';
  const subtitle = 'Esperienza Cliente';
  const nextSteps = [
    'Completa il tuo profilo personale.',
    'Scegli il tuo barbiere preferito.',
    'Prenota il tuo primo appuntamento in pochi secondi.',
  ];

  const text = [
    `Ciao ${safeName},`,
    '',
    'Benvenuto su My Barber.',
    'Il tuo account Cliente e stato creato con successo.',
    '',
    `Nome: ${safeName}`,
    `Email: ${safeEmail}`,
    'Ruolo: Cliente',
    '',
    'Prossimi passi:',
    '1) Completa il tuo profilo personale.',
    '2) Scegli il tuo barbiere preferito.',
    '3) Prenota il tuo primo appuntamento in pochi secondi.',
    '',
    `Accedi ora: ${WEBSITE_URL}`,
    '',
    'Il Team My Barber',
  ].join('\n');

  const html = buildHtmlTemplate({
    preheader: 'Benvenuto su My Barber. Il tuo account Cliente e attivo.',
    title,
    subtitle,
    heroImageUrl: CLIENT_HERO_IMAGE,
    greeting: `Ciao <strong>${safeName}</strong>,`,
    intro: 'il tuo account Cliente e stato creato con successo. Siamo felici di averti con noi.',
    roleLabel,
    safeName,
    safeEmail,
    nextSteps,
    ctaLabel: 'Prenota il tuo look',
  });

  return {
    subject: 'Benvenuto su My Barber',
    text,
    html,
  };
};

const buildBarberWelcomeEmail = ({ safeName, safeEmail }) => {
  const title = 'Benvenuto nel Team My Barber';
  const roleLabel = 'Barbiere';
  const subtitle = 'Area Professionale';
  const nextSteps = [
    'Completa la scheda del tuo salone con indirizzo e orari.',
    'Configura servizi, prezzi e tempi di lavoro.',
    'Pubblica disponibilita e inizia a ricevere prenotazioni.',
  ];

  const text = [
    `Ciao ${safeName},`,
    '',
    'Benvenuto su My Barber.',
    'Il tuo account Barbiere e stato creato con successo.',
    '',
    `Nome: ${safeName}`,
    `Email: ${safeEmail}`,
    'Ruolo: Barbiere',
    '',
    'Prossimi passi:',
    '1) Completa la scheda del tuo salone con indirizzo e orari.',
    '2) Configura servizi, prezzi e tempi di lavoro.',
    '3) Pubblica disponibilita e inizia a ricevere prenotazioni.',
    '',
    `Accedi ora: ${WEBSITE_URL}`,
    '',
    'Il Team My Barber',
  ].join('\n');

  const html = buildHtmlTemplate({
    preheader: 'Benvenuto su My Barber. Il tuo account Barbiere e attivo.',
    title,
    subtitle,
    heroImageUrl: BARBER_HERO_IMAGE,
    greeting: `Ciao <strong>${safeName}</strong>,`,
    intro: 'il tuo account Barbiere e stato creato con successo. Ora puoi gestire agenda, servizi e appuntamenti.',
    roleLabel,
    safeName,
    safeEmail,
    nextSteps,
    ctaLabel: 'Apri la tua area Pro',
  });

  return {
    subject: 'Benvenuto su My Barber',
    text,
    html,
  };
};

const buildWelcomeEmail = ({ name, role, email }) => {
  const normalizedName = typeof name === 'string' && name.trim() ? name.trim() : 'Cliente';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  const safeName = escapeHtml(normalizedName);
  const safeEmail = escapeHtml(normalizedEmail || 'non disponibile');

  if (role === 'barber') {
    return buildBarberWelcomeEmail({ safeName, safeEmail });
  }

  return buildClientWelcomeEmail({ safeName, safeEmail });
};

const normalizeString = (value, fallback = '') =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const normalizeDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const formatDateLabel = (value) => {
  const parsed = normalizeDate(value);
  if (!parsed) return 'Data non disponibile';

  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const formatTimeLabel = (value) => {
  const parsed = normalizeDate(value);
  if (!parsed) return 'Orario non disponibile';

  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const formatPriceLabel = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 'Prezzo non disponibile';
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const buildBookingConfirmationEmail = ({
  email,
  name,
  bookingId,
  shopName,
  shopAddress,
  shopCity,
  barberName,
  serviceName,
  startAt,
  endAt,
  durationMin,
  price,
}) => {
  const normalizedName = normalizeString(name, 'Cliente');
  const normalizedEmail = normalizeString(email, 'non disponibile').toLowerCase();
  const normalizedBookingId = normalizeString(bookingId, 'N/D');
  const normalizedShopName = normalizeString(shopName, 'My Barber');
  const normalizedBarberName = normalizeString(barberName, 'Barbiere non assegnato');
  const normalizedServiceName = normalizeString(serviceName, 'Servizio non disponibile');
  const normalizedShopAddress = [normalizeString(shopAddress), normalizeString(shopCity)]
    .filter(Boolean)
    .join(', ');

  const dateLabel = formatDateLabel(startAt);
  const timeRangeLabel = `${formatTimeLabel(startAt)}${normalizeDate(endAt) ? ` - ${formatTimeLabel(endAt)}` : ''}`;
  const durationLabel =
    typeof durationMin === 'number' && Number.isFinite(durationMin) && durationMin > 0
      ? `${durationMin} min`
      : 'Durata non disponibile';
  const priceLabel = formatPriceLabel(price);

  const safeName = escapeHtml(normalizedName);
  const safeEmail = escapeHtml(normalizedEmail);
  const safeBookingId = escapeHtml(normalizedBookingId);
  const safeShopName = escapeHtml(normalizedShopName);
  const safeShopAddress = escapeHtml(normalizedShopAddress || 'Indirizzo non disponibile');
  const safeBarberName = escapeHtml(normalizedBarberName);
  const safeServiceName = escapeHtml(normalizedServiceName);
  const safeDateLabel = escapeHtml(dateLabel);
  const safeTimeRangeLabel = escapeHtml(timeRangeLabel);
  const safeDurationLabel = escapeHtml(durationLabel);
  const safePriceLabel = escapeHtml(priceLabel);
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);

  const text = [
    `Ciao ${normalizedName},`,
    '',
    'La tua prenotazione My Barber e confermata.',
    '',
    `Codice prenotazione: ${normalizedBookingId}`,
    `Negozio: ${normalizedShopName}`,
    `Indirizzo: ${normalizedShopAddress || 'Indirizzo non disponibile'}`,
    `Barbiere: ${normalizedBarberName}`,
    `Servizio: ${normalizedServiceName}`,
    `Data: ${dateLabel}`,
    `Orario: ${timeRangeLabel}`,
    `Durata: ${durationLabel}`,
    `Prezzo: ${priceLabel}`,
    '',
    `Account: ${normalizedEmail}`,
    '',
    'Promemoria rapido:',
    '- Arriva 5 minuti prima dell orario.',
    '- Mostra il codice prenotazione al desk.',
    '- Se devi cambiare orario, gestisci tutto dalla tua area My Barber.',
    '',
    `Gestisci le tue prenotazioni: ${WEBSITE_URL}`,
    `Supporto: ${SUPPORT_EMAIL}`,
    '',
    'Il Team My Barber',
  ].join('\n');

  const html = `
    <!doctype html>
    <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Prenotazione confermata</title>
      </head>
      <body style="margin:0; padding:0; background:#0d0906; font-family:Arial, sans-serif;">
        <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">
          Prenotazione confermata. Il tuo codice e ${safeBookingId}.
        </span>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0906; padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:660px; border:1px solid #6c4a22; border-radius:16px; overflow:hidden; background:#f7f0e6;">
                <tr>
                  <td style="background:#17120e; border-bottom:1px solid #8d6636; padding:22px 24px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="font-family:Georgia, 'Times New Roman', serif; color:#e7c793; font-size:40px; letter-spacing:1px; font-weight:700;">
                          MY BARBER
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:8px; color:#c8aa7f; font-size:12px; letter-spacing:2.1px; text-transform:uppercase;">
                          Concierge Booking Confirmation
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:12px;">
                          <span style="display:inline-block; background:#20160d; border:1px solid #9f7844; color:#f0d8b0; font-size:11px; letter-spacing:1.6px; text-transform:uppercase; font-weight:700; padding:7px 14px; border-radius:999px;">
                            Prenotazione confermata
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0;">
                    <img src="${BOOKING_HERO_IMAGE}" alt="My Barber Booking" width="660" style="display:block; width:100%; max-width:660px; height:auto; border:0;" />
                  </td>
                </tr>

                <tr>
                  <td style="padding:26px 30px 12px; color:#2e251c;">
                    <p style="margin:0 0 10px; font-family:Georgia, 'Times New Roman', serif; font-size:38px; line-height:1.08;">
                      Il tuo posto in poltrona e pronto
                    </p>
                    <p style="margin:0; font-size:17px; line-height:1.7;">
                      Ciao <strong>${safeName}</strong>, abbiamo riservato il tuo appuntamento premium da <strong>${safeShopName}</strong>.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17120e; border:1px solid #8c6737; border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:12px 16px 2px; color:#b89b74; text-transform:uppercase; letter-spacing:1.4px; font-size:11px; font-weight:700;">
                          Codice prenotazione
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 16px 12px; color:#f1d6ac; font-size:30px; font-family:Georgia, 'Times New Roman', serif; letter-spacing:1px; font-weight:700;">
                          ${safeBookingId}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f1; border:1px solid #d3b68e; border-radius:10px;">
                      <tr>
                        <td colspan="2" style="padding:14px 16px; border-bottom:1px solid #e6d4ba; font-size:13px; color:#7b5a31; letter-spacing:1.3px; text-transform:uppercase; font-weight:700;">
                          Riepilogo appuntamento
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Negozio</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeShopName}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Indirizzo</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeShopAddress}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Barbiere</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeBarberName}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Servizio</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeServiceName}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Data</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeDateLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Orario</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeTimeRangeLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Durata</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeDurationLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Prezzo</td>
                        <td style="padding:12px 16px; font-size:17px; color:#2f271e; font-weight:800;">${safePriceLabel}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1b140d; border:1px solid #7d5b32; border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px 8px; color:#f0d7ad; font-size:13px; letter-spacing:1.2px; text-transform:uppercase; font-weight:700;">
                          Promemoria premium
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 6px; color:#ead8bf; font-size:15px; line-height:1.6;">
                          - Arriva 5 minuti prima dell orario.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 6px; color:#ead8bf; font-size:15px; line-height:1.6;">
                          - Mostra il codice prenotazione al desk.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px; color:#ead8bf; font-size:15px; line-height:1.6;">
                          - Account associato: <strong>${safeEmail}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:6px 30px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="background:#17120e; border:1px solid #a57b43; border-radius:9px;">
                          <a href="${WEBSITE_URL}" style="display:inline-block; padding:15px 32px; color:#f4e3c8; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:700; text-decoration:none;">
                            Gestisci prenotazione
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 22px; color:#2f271e;">
                    <p style="margin:0 0 8px; font-size:16px; line-height:1.7;">
                      Per supporto scrivici a
                      <a href="mailto:${safeSupportEmail}" style="color:#2f271e; font-weight:700; text-decoration:underline;">${safeSupportEmail}</a>.
                    </p>
                    <p style="margin:0; font-size:16px; line-height:1.7;">
                      Grazie per aver scelto My Barber.<br />
                      <strong>Il Team My Barber</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#17120e; border-top:1px solid #7e5a2f; padding:14px 18px;">
                    <p style="margin:0; text-align:center; color:#d6b987; font-size:13px; line-height:1.7;">
                      Seguici su
                      <a href="https://www.instagram.com" style="color:#d6b987; text-decoration:none;">Instagram</a>
                      e
                      <a href="https://www.facebook.com" style="color:#d6b987; text-decoration:none;">Facebook</a>
                    </p>
                    <p style="margin:6px 0 0; text-align:center; color:#b38e59; font-size:12px; line-height:1.7;">
                      &copy; ${YEAR} My Barber. Elegance in every cut.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return {
    subject: `Conferma prenotazione ${normalizedShopName} | ${normalizedBookingId}`,
    text,
    html,
  };
};

const buildBookingCancellationEmail = ({
  email,
  name,
  bookingId,
  shopName,
  shopAddress,
  shopCity,
  barberName,
  serviceName,
  startAt,
  endAt,
  durationMin,
  price,
  cancelledReason,
  cancelledAt,
}) => {
  const normalizedName = normalizeString(name, 'Cliente');
  const normalizedEmail = normalizeString(email, 'non disponibile').toLowerCase();
  const normalizedBookingId = normalizeString(bookingId, 'N/D');
  const normalizedShopName = normalizeString(shopName, 'My Barber');
  const normalizedBarberName = normalizeString(barberName, 'Barbiere non assegnato');
  const normalizedServiceName = normalizeString(serviceName, 'Servizio non disponibile');
  const normalizedShopAddress = [normalizeString(shopAddress), normalizeString(shopCity)]
    .filter(Boolean)
    .join(', ');
  const normalizedReason = normalizeString(cancelledReason, 'Nessuna motivazione specificata');

  const bookingDateLabel = formatDateLabel(startAt);
  const timeRangeLabel = `${formatTimeLabel(startAt)}${normalizeDate(endAt) ? ` - ${formatTimeLabel(endAt)}` : ''}`;
  const cancellationDateLabel = formatDateLabel(cancelledAt || new Date());
  const durationLabel =
    typeof durationMin === 'number' && Number.isFinite(durationMin) && durationMin > 0
      ? `${durationMin} min`
      : 'Durata non disponibile';
  const priceLabel = formatPriceLabel(price);

  const safeName = escapeHtml(normalizedName);
  const safeEmail = escapeHtml(normalizedEmail);
  const safeBookingId = escapeHtml(normalizedBookingId);
  const safeShopName = escapeHtml(normalizedShopName);
  const safeShopAddress = escapeHtml(normalizedShopAddress || 'Indirizzo non disponibile');
  const safeBarberName = escapeHtml(normalizedBarberName);
  const safeServiceName = escapeHtml(normalizedServiceName);
  const safeBookingDateLabel = escapeHtml(bookingDateLabel);
  const safeTimeRangeLabel = escapeHtml(timeRangeLabel);
  const safeCancellationDateLabel = escapeHtml(cancellationDateLabel);
  const safeDurationLabel = escapeHtml(durationLabel);
  const safePriceLabel = escapeHtml(priceLabel);
  const safeReason = escapeHtml(normalizedReason);
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);

  const text = [
    `Ciao ${normalizedName},`,
    '',
    'La tua prenotazione My Barber e stata annullata con successo.',
    '',
    `Codice prenotazione: ${normalizedBookingId}`,
    `Negozio: ${normalizedShopName}`,
    `Indirizzo: ${normalizedShopAddress || 'Indirizzo non disponibile'}`,
    `Barbiere: ${normalizedBarberName}`,
    `Servizio: ${normalizedServiceName}`,
    `Data appuntamento: ${bookingDateLabel}`,
    `Orario: ${timeRangeLabel}`,
    `Durata: ${durationLabel}`,
    `Prezzo: ${priceLabel}`,
    `Motivazione annullamento: ${normalizedReason}`,
    `Annullato il: ${cancellationDateLabel}`,
    '',
    `Account: ${normalizedEmail}`,
    '',
    `Prenota di nuovo quando vuoi: ${WEBSITE_URL}`,
    `Supporto: ${SUPPORT_EMAIL}`,
    '',
    'Il Team My Barber',
  ].join('\n');

  const html = `
    <!doctype html>
    <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Prenotazione annullata</title>
      </head>
      <body style="margin:0; padding:0; background:#0d0906; font-family:Arial, sans-serif;">
        <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">
          Prenotazione annullata. Codice ${safeBookingId}.
        </span>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0906; padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:660px; border:1px solid #6c4a22; border-radius:16px; overflow:hidden; background:#f7f0e6;">
                <tr>
                  <td style="background:#17120e; border-bottom:1px solid #8d6636; padding:22px 24px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="font-family:Georgia, 'Times New Roman', serif; color:#e7c793; font-size:40px; letter-spacing:1px; font-weight:700;">
                          MY BARBER
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:8px; color:#c8aa7f; font-size:12px; letter-spacing:2.1px; text-transform:uppercase;">
                          Concierge Booking Update
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:12px;">
                          <span style="display:inline-block; background:#2a1614; border:1px solid #b56a63; color:#f5c2bc; font-size:11px; letter-spacing:1.6px; text-transform:uppercase; font-weight:700; padding:7px 14px; border-radius:999px;">
                            Prenotazione annullata
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0;">
                    <img src="${BOOKING_HERO_IMAGE}" alt="My Barber Booking Update" width="660" style="display:block; width:100%; max-width:660px; height:auto; border:0;" />
                  </td>
                </tr>

                <tr>
                  <td style="padding:26px 30px 12px; color:#2e251c;">
                    <p style="margin:0 0 10px; font-family:Georgia, 'Times New Roman', serif; font-size:38px; line-height:1.08;">
                      Annullamento registrato
                    </p>
                    <p style="margin:0; font-size:17px; line-height:1.7;">
                      Ciao <strong>${safeName}</strong>, abbiamo confermato l'annullamento della tua prenotazione da <strong>${safeShopName}</strong>.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2a1614; border:1px solid #b56a63; border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:12px 16px 2px; color:#e6aba4; text-transform:uppercase; letter-spacing:1.4px; font-size:11px; font-weight:700;">
                          Codice annullato
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 16px 12px; color:#ffd3cc; font-size:30px; font-family:Georgia, 'Times New Roman', serif; letter-spacing:1px; font-weight:700;">
                          ${safeBookingId}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f1; border:1px solid #d3b68e; border-radius:10px;">
                      <tr>
                        <td colspan="2" style="padding:14px 16px; border-bottom:1px solid #e6d4ba; font-size:13px; color:#7b5a31; letter-spacing:1.3px; text-transform:uppercase; font-weight:700;">
                          Dettagli prenotazione annullata
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Negozio</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeShopName}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Indirizzo</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeShopAddress}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Barbiere</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeBarberName}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Servizio</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeServiceName}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Data appuntamento</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeBookingDateLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Orario</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeTimeRangeLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Durata</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeDurationLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Prezzo</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:17px; color:#2f271e; font-weight:800;">${safePriceLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Motivazione</td>
                        <td style="padding:12px 16px; border-bottom:1px solid #eee1ce; font-size:15px; color:#2f271e;">${safeReason}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px; width:34%; font-size:14px; color:#6e5536; font-weight:700;">Annullato il</td>
                        <td style="padding:12px 16px; font-size:15px; color:#2f271e;">${safeCancellationDateLabel}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1b140d; border:1px solid #7d5b32; border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px 8px; color:#f0d7ad; font-size:13px; letter-spacing:1.2px; text-transform:uppercase; font-weight:700;">
                          Prossimo step
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px; color:#ead8bf; font-size:15px; line-height:1.6;">
                          Quando vuoi, puoi fissare una nuova prenotazione con priorita direttamente dalla tua area My Barber.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:6px 30px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="background:#17120e; border:1px solid #a57b43; border-radius:9px;">
                          <a href="${WEBSITE_URL}" style="display:inline-block; padding:15px 32px; color:#f4e3c8; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:700; text-decoration:none;">
                            Prenota di nuovo
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 22px; color:#2f271e;">
                    <p style="margin:0 0 8px; font-size:16px; line-height:1.7;">
                      Per supporto scrivici a
                      <a href="mailto:${safeSupportEmail}" style="color:#2f271e; font-weight:700; text-decoration:underline;">${safeSupportEmail}</a>.
                    </p>
                    <p style="margin:0; font-size:16px; line-height:1.7;">
                      Ti aspettiamo presto in salone.<br />
                      <strong>Il Team My Barber</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#17120e; border-top:1px solid #7e5a2f; padding:14px 18px;">
                    <p style="margin:0; text-align:center; color:#d6b987; font-size:13px; line-height:1.7;">
                      Seguici su
                      <a href="https://www.instagram.com" style="color:#d6b987; text-decoration:none;">Instagram</a>
                      e
                      <a href="https://www.facebook.com" style="color:#d6b987; text-decoration:none;">Facebook</a>
                    </p>
                    <p style="margin:6px 0 0; text-align:center; color:#b38e59; font-size:12px; line-height:1.7;">
                      &copy; ${YEAR} My Barber. Elegance in every cut.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return {
    subject: `Prenotazione annullata ${normalizedShopName} | ${normalizedBookingId}`,
    text,
    html,
  };
};

const buildPasswordResetEmail = ({ email, name, resetToken, expiresInMin = 15 }) => {
  const normalizedName = normalizeString(name, 'Cliente');
  const normalizedEmail = normalizeString(email, 'non disponibile').toLowerCase();
  const normalizedToken = normalizeString(resetToken, '');
  const safeName = escapeHtml(normalizedName);
  const safeEmail = escapeHtml(normalizedEmail);
  const safeToken = escapeHtml(normalizedToken);
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);
  const resetUrl = `${WEBSITE_URL}/reset-password?token=${encodeURIComponent(normalizedToken)}`;
  const safeResetUrl = escapeHtml(resetUrl);

  const text = [
    `Ciao ${normalizedName},`,
    '',
    'Abbiamo ricevuto una richiesta di reset password per il tuo account My Barber.',
    '',
    `Key reset: ${normalizedToken}`,
    `Scadenza: ${expiresInMin} minuti`,
    '',
    `Link reset: ${resetUrl}`,
    '',
    'Se non sei stato tu, ignora questa email.',
    `Supporto: ${SUPPORT_EMAIL}`,
    '',
    'Il Team My Barber',
  ].join('\n');

  const html = `
    <!doctype html>
    <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset password My Barber</title>
      </head>
      <body style="margin:0; padding:0; background:#0d0906; font-family:Arial, sans-serif;">
        <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">
          Richiesta reset password. Key valida per ${expiresInMin} minuti.
        </span>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0906; padding:30px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; border:1px solid #6c4a22; border-radius:14px; overflow:hidden; background:#f7f1e8;">
                <tr>
                  <td style="background:#17120e; border-bottom:1px solid #8d6636; padding:18px 24px;">
                    <p style="margin:0; text-align:center; font-family:Georgia, 'Times New Roman', serif; color:#e7c793; font-size:36px; font-weight:700;">
                      MY BARBER
                    </p>
                    <p style="margin:6px 0 0; text-align:center; color:#c8aa7f; font-size:12px; letter-spacing:2px; text-transform:uppercase;">
                      Security Reset
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 8px; color:#2e251c;">
                    <p style="margin:0 0 10px; font-family:Georgia, 'Times New Roman', serif; font-size:34px; line-height:1.1;">
                      Reset Password
                    </p>
                    <p style="margin:0 0 8px; font-size:16px; line-height:1.7;">
                      Ciao <strong>${safeName}</strong>, abbiamo ricevuto la richiesta di reset per l'account <strong>${safeEmail}</strong>.
                    </p>
                    <p style="margin:0; font-size:16px; line-height:1.7;">
                      Usa la key qui sotto entro <strong>${expiresInMin} minuti</strong>.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:16px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17120e; border:1px solid #8c6737; border-radius:10px;">
                      <tr>
                        <td align="center" style="padding:12px 14px 4px; color:#b89b74; text-transform:uppercase; letter-spacing:1.4px; font-size:11px; font-weight:700;">
                          Key reset password
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 14px 14px; color:#f1d6ac; font-size:28px; font-family:Georgia, 'Times New Roman', serif; letter-spacing:0.8px; font-weight:700; word-break:break-all;">
                          ${safeToken}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:6px 28px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="background:#17120e; border:1px solid #a57b43; border-radius:8px;">
                          <a href="${safeResetUrl}" style="display:inline-block; padding:14px 28px; color:#f4e3c8; font-family:Georgia, 'Times New Roman', serif; font-size:24px; font-weight:700; text-decoration:none;">
                            Apri reset password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px 20px; color:#2f271e;">
                    <p style="margin:0 0 8px; font-size:15px; line-height:1.7;">
                      Se non sei stato tu, ignora questa email: la password non verra modificata senza conferma.
                    </p>
                    <p style="margin:0; font-size:15px; line-height:1.7;">
                      Supporto:
                      <a href="mailto:${safeSupportEmail}" style="color:#2f271e; font-weight:700; text-decoration:underline;">${safeSupportEmail}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#17120e; border-top:1px solid #7e5a2f; padding:12px 16px;">
                    <p style="margin:0; text-align:center; color:#d6b987; font-size:12px; line-height:1.7;">
                      &copy; ${YEAR} My Barber
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return {
    subject: 'My Barber | Reset password',
    text,
    html,
  };
};

const sendWelcomeEmail = async ({ email, name, role }) => {
  if (!email) return { skipped: true };

  const content = buildWelcomeEmail({ name, role, email });
  return sendEmail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
};

const sendPasswordResetEmail = async ({ email, name, resetToken, expiresInMin = 15 }) => {
  if (!email || !resetToken) return { skipped: true };

  const content = buildPasswordResetEmail({
    email,
    name,
    resetToken,
    expiresInMin,
  });

  return sendEmail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
};

const sendBookingConfirmationEmail = async ({
  email,
  name,
  bookingId,
  shopName,
  shopAddress,
  shopCity,
  barberName,
  serviceName,
  startAt,
  endAt,
  durationMin,
  price,
}) => {
  if (!email) return { skipped: true };

  const content = buildBookingConfirmationEmail({
    email,
    name,
    bookingId,
    shopName,
    shopAddress,
    shopCity,
    barberName,
    serviceName,
    startAt,
    endAt,
    durationMin,
    price,
  });

  return sendEmail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
};

const sendBookingCancellationEmail = async ({
  email,
  name,
  bookingId,
  shopName,
  shopAddress,
  shopCity,
  barberName,
  serviceName,
  startAt,
  endAt,
  durationMin,
  price,
  cancelledReason,
  cancelledAt,
}) => {
  if (!email) return { skipped: true };

  const content = buildBookingCancellationEmail({
    email,
    name,
    bookingId,
    shopName,
    shopAddress,
    shopCity,
    barberName,
    serviceName,
    startAt,
    endAt,
    durationMin,
    price,
    cancelledReason,
    cancelledAt,
  });

  return sendEmail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
};
