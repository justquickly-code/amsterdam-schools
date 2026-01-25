# Email Templates (Supabase Auth)

These templates are used in **Supabase → Authentication → Email Templates**.
They are bilingual (NL + EN) and use the hosted logo on `mijnschoolkeuze.com`.

---

## Magic Link

**Subject:** Inloglink voor Mijn Schoolkeuze (Sign‑in link)

```html
<table style="width:100%;background:#f7f7f7;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td>
      <table style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <img src="https://mijnschoolkeuze.com/branding/mijnschoolkeuze_kit_v4/wordmark.png" alt="Mijn Schoolkeuze" style="height:40px;" />
          </td>
        </tr>
        <tr>
          <td>
            <h2 style="margin:0 0 6px 0;color:#111827;font-size:20px;">Je inloglink staat klaar</h2>
            <p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;">Your sign‑in link is ready</p>
            <p style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.5;">
              Klik op de knop hieronder om in te loggen. Je blijft ingelogd op dit apparaat.
            </p>
            <p style="margin:0 0 14px 0;color:#6b7280;font-size:12px;">
              Click the button below to sign in.
            </p>

            <div style="text-align:center;margin:18px 0;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">
                Log in / Sign in
              </a>
            </div>

            <p style="margin:0 0 10px 0;color:#6b7280;font-size:12px;">
              Werkt de knop niet? Plak deze link in je browser:
              <br />
              <a href="{{ .ConfirmationURL }}" style="color:#ef4444;">{{ .ConfirmationURL }}</a>
            </p>
            <p style="margin:0 0 18px 0;color:#6b7280;font-size:12px;">
              If the button doesn’t work, paste the link above in your browser.
            </p>

            <p style="margin:0;color:#6b7280;font-size:12px;">
              Geen mail? Check je spam of ongewenste e‑mail. (No email? Check spam.)
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## Invite User

**Subject:** Uitnodiging voor Mijn Schoolkeuze (Invitation)

```html
<table style="width:100%;background:#f7f7f7;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td>
      <table style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <img src="https://mijnschoolkeuze.com/branding/mijnschoolkeuze_kit_v4/wordmark.png" alt="Mijn Schoolkeuze" style="height:40px;" />
          </td>
        </tr>
        <tr>
          <td>
            <h2 style="margin:0 0 6px 0;color:#111827;font-size:20px;">Je bent uitgenodigd</h2>
            <p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;">You’ve been invited</p>
            <p style="margin:0 0 12px 0;color:#374151;font-size:14px;line-height:1.5;">
              Je bent uitgenodigd om samen een schoolkeuzelijst te maken in Mijn Schoolkeuze.
              Je kunt open dagen bekijken, scholen bewaren en notities delen.
            </p>
            <p style="margin:0 0 12px 0;color:#6b7280;font-size:12px;">
              You can view open days, save schools, and share notes.
            </p>

            <div style="text-align:center;margin:18px 0;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">
                Accepteer uitnodiging / Accept invitation
              </a>
            </div>

            <p style="margin:0 0 10px 0;color:#6b7280;font-size:12px;">
              Werkt de knop niet? Plak deze link in je browser:
              <br />
              <a href="{{ .ConfirmationURL }}" style="color:#ef4444;">{{ .ConfirmationURL }}</a>
            </p>
            <p style="margin:0;color:#6b7280;font-size:12px;">
              If the button doesn’t work, paste the link above in your browser.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```
