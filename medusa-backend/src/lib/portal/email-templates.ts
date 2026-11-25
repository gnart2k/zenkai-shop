/** Vietnamese transactional emails of the partner portal (subject, HTML and plain text). */
export type RenderedEmail = { subject: string; html: string; text: string };

type Input = { storeName?: string | null; portalUrl: string; data: Record<string, unknown> };

const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

function layout(
  title: string,
  lines: string[],
  cta?: { label: string; url: string },
  footer?: string
) {
  const body = lines.map((l) => `<p style="margin:0 0 14px;line-height:1.55">${l}</p>`).join('');
  const button = cta
    ? `<p style="margin:22px 0"><a href="${esc(cta.url)}" style="background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">${esc(cta.label)}</a></p>
       <p style="margin:0 0 14px;color:#666;font-size:13px">Nếu nút không bấm được, mở liên kết này:<br><a href="${esc(cta.url)}" style="color:#444;word-break:break-all">${esc(cta.url)}</a></p>`
    : '';
  const html = `<!doctype html><html lang="vi"><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;padding:28px">
<h2 style="margin:0 0 18px;font-size:20px">${esc(title)}</h2>${body}${button}
<p style="margin:24px 0 0;color:#888;font-size:12px">${esc(footer ?? 'Email tự động từ Cổng đối tác. Vui lòng không trả lời email này.')}</p>
</div></body></html>`;
  const text = [
    title,
    '',
    ...lines.map((l) => l.replace(/<[^>]+>/g, '')),
    cta ? `\n${cta.label}: ${cta.url}` : '',
  ].join('\n');
  return { html, text };
}

export function renderPortalEmail(template: string, input: Input): RenderedEmail | null {
  const { storeName, portalUrl, data } = input;
  const store = storeName ? `“${esc(storeName)}”` : 'cửa hàng';
  const plainStore = storeName ?? 'cửa hàng';
  const link = typeof data.invite_link === 'string' ? data.invite_link : null;

  switch (template) {
    case 'portal-collaborator-invite': {
      const subject = `Lời mời làm cộng tác viên của ${plainStore}`;
      const { html, text } = layout(
        subject,
        [
          `Xin chào,`,
          `Bạn được mời làm <b>cộng tác viên</b> của ${store}. Bấm nút bên dưới để đặt mật khẩu và bắt đầu. Liên kết có hiệu lực trong 7 ngày.`,
        ],
        link ? { label: 'Chấp nhận lời mời', url: link } : undefined
      );
      return { subject, html, text };
    }
    case 'portal-added-to-store': {
      const subject = `Bạn đã được thêm vào ${plainStore}`;
      const { html, text } = layout(
        subject,
        [
          `Xin chào,`,
          `Bạn vừa được thêm làm cộng tác viên của ${store}. Đăng nhập bằng tài khoản hiện có để xem sản phẩm của cửa hàng này.`,
        ],
        { label: 'Mở cổng đối tác', url: `${portalUrl}/login` }
      );
      return { subject, html, text };
    }
    case 'portal-admin-invite': {
      const subject = `Lời mời quản trị cửa hàng ${plainStore}`;
      const { html, text } = layout(
        subject,
        [
          `Xin chào,`,
          `Bạn được mời làm <b>quản trị viên</b> của ${store} trên Cổng đối tác. Bấm nút bên dưới để đặt mật khẩu. Liên kết có hiệu lực trong 7 ngày.`,
        ],
        link
          ? { label: 'Thiết lập tài khoản', url: link }
          : { label: 'Đăng nhập', url: `${portalUrl}/login` }
      );
      return { subject, html, text };
    }
    case 'portal-new-request': {
      const subject = 'Có yêu cầu bán hàng mới cần duyệt';
      const { html, text } = layout(
        subject,
        [
          `Một cộng tác viên vừa gửi yêu cầu bán${data.sku ? ` sản phẩm <b>${esc(data.sku)}</b>` : ''}. Vui lòng kiểm tra bằng chứng đặt cọc và duyệt.`,
        ],
        {
          label: 'Xem yêu cầu',
          url: `${portalUrl}/admin/requests/${encodeURIComponent(String(data.request_id ?? ''))}`,
        }
      );
      return { subject, html, text };
    }
    case 'portal-request-approved-collaborator': {
      const subject = 'Yêu cầu của bạn đã được duyệt';
      const pay = typeof data.payment_link === 'string' ? data.payment_link : null;
      const { html, text } = layout(
        subject,
        [
          'Yêu cầu bán hàng của bạn đã được duyệt. Đường dẫn thanh toán đã được gửi tới khách hàng.',
        ],
        pay
          ? { label: 'Mở trang thanh toán của khách', url: pay }
          : { label: 'Mở cổng đối tác', url: `${portalUrl}/collaborator` }
      );
      return { subject, html, text };
    }
    case 'portal-request-approved-customer': {
      const subject = 'Đơn hàng của bạn đã sẵn sàng thanh toán';
      const pay = typeof data.payment_link === 'string' ? data.payment_link : null;
      const { html, text } = layout(
        subject,
        [
          'Cảm ơn bạn đã đặt cọc. Đơn hàng của bạn đã được xác nhận, bấm nút bên dưới để hoàn tất thanh toán.',
        ],
        pay ? { label: 'Thanh toán đơn hàng', url: pay } : undefined,
        'Nếu bạn không đặt hàng, hãy bỏ qua email này.'
      );
      return { subject, html, text };
    }
    case 'portal-request-rejected': {
      const subject = 'Yêu cầu của bạn chưa được duyệt';
      const { html, text } = layout(
        subject,
        [
          'Rất tiếc, yêu cầu bán hàng của bạn chưa được duyệt.',
          `<b>Lý do:</b> ${esc(data.reason ?? '—')}`,
        ],
        { label: 'Mở cổng đối tác', url: `${portalUrl}/collaborator` }
      );
      return { subject, html, text };
    }
    default:
      return null;
  }
}
