import {
  cleanImage,
  cleanLink,
  cleanPhone,
  cleanZalo,
  DEFAULT_STOREFRONT_CONFIG,
  readStorefrontConfig,
  sanitizeStorefrontConfig,
} from '../portal/storefront-config';

describe('storefront config', () => {
  it('falls back to the classic default when nothing is stored', () => {
    expect(readStorefrontConfig(undefined)).toEqual(DEFAULT_STOREFRONT_CONFIG);
    expect(readStorefrontConfig({ branding: { tagline: 'x' } })).toEqual(DEFAULT_STOREFRONT_CONFIG);
  });

  it('keeps a valid theme, color, sections, header and footer', () => {
    const cfg = sanitizeStorefrontConfig({
      template_id: 'warm',
      primary_color: '#aa3322',
      home: [
        {
          id: 'hero-1',
          type: 'hero',
          enabled: true,
          settings: { style: 'split', heading: { vi: 'Xin chào', en: 'Hello' } },
        },
        {
          id: 'iwt-1',
          type: 'image-with-text',
          enabled: false,
          settings: { image: '/media/abc-123.jpg', button_link: '/store' },
        },
      ],
      header: {
        announcement: { enabled: true, text: { vi: 'Miễn phí vận chuyển' }, link: '/store' },
      },
      footer: {
        contact: [
          { label: 'Hotline', href: 'tel:0900000000', kind: 'phone' },
          { label: '12 Nguyen Trai, Q1', kind: 'address' },
        ],
        show_collections: false,
      },
    });
    expect(cfg.template_id).toBe('warm');
    expect(cfg.home?.[0].settings.heading).toEqual({ vi: 'Xin chào', en: 'Hello' });
    expect(cfg.home?.[1]).toMatchObject({
      enabled: false,
      settings: { image: '/media/abc-123.jpg', button_link: '/store' },
    });
    expect(cfg.header?.announcement.enabled).toBe(true);
    expect(cfg.footer).toMatchObject({ show_categories: true, show_collections: false });
    // An address has no link and must survive (it used to be dropped).
    expect(cfg.footer?.contact).toEqual([
      { label: 'Hotline', href: 'tel:0900000000', kind: 'phone' },
      { label: '12 Nguyen Trai, Q1', href: '', kind: 'address' },
    ]);
  });

  it('drops unknown themes, bad colors, unknown or duplicate sections and bad keys', () => {
    const cfg = sanitizeStorefrontConfig({
      template_id: 'neon',
      primary_color: 'red; background:url(x)',
      home: [
        { id: 'a', type: 'shop', settings: { 'bad key': 'x', ok_key: 'fine' } },
        { id: 'a', type: 'shop' },
        { id: 'b', type: 'script' },
        { id: 'Bad Id', type: 'values' },
      ],
    });
    expect(cfg.template_id).toBe('classic');
    expect(cfg.primary_color).toBeNull();
    expect(cfg.home).toHaveLength(1);
    expect(cfg.home?.[0].settings).toEqual({ ok_key: 'fine' });
  });

  it('only allows safe links and images', () => {
    expect(cleanLink('/store')).toBe('/store');
    expect(cleanLink('https://example.com')).toBe('https://example.com');
    expect(cleanLink('tel:0900')).toBe('tel:0900');
    expect(cleanLink('javascript:alert(1)')).toBe('');
    expect(cleanLink('//evil.com')).toBe('');
    expect(cleanLink('data:text/html,x')).toBe('');
    expect(cleanImage('/media/lumpa-media-x-01ABC.jpg')).toBe('/media/lumpa-media-x-01ABC.jpg');
    expect(cleanImage('http://insecure.com/a.jpg')).toBe('');
    expect(cleanImage('/media/../../etc/passwd')).toBe('');
  });

  it('sanitizes link and image settings by key name', () => {
    const cfg = sanitizeStorefrontConfig({
      template_id: 'classic',
      home: [
        {
          id: 'x',
          type: 'rich-text',
          settings: { button_link: 'javascript:alert(1)', image: 'data:x' },
        },
      ],
    });
    expect(cfg.home?.[0].settings).toEqual({ button_link: '', image: '' });
  });

  it('sanitizes branding and text overrides', () => {
    const cfg = sanitizeStorefrontConfig({
      template_id: 'classic',
      branding: {
        store_name: { vi: 'Cửa hàng Đèn', en: 'Lamp Shop' },
        logo: '/media/lumpa-media-logo-01ABC.png',
        logo_height: 500,
        tagline: { vi: 'Ánh sáng ấm' },
        favicon: 'javascript:alert(1)',
      },
      texts: {
        'Home.valueTitle': { vi: 'Vì sao chọn {name} <b>chúng tôi</b>', en: '' },
        'bad key': { vi: 'x' },
        'Footer.contact': 'not an object',
      },
    });
    expect(cfg.branding).toMatchObject({
      logo: '/media/lumpa-media-logo-01ABC.png',
      logo_height: 96,
      favicon: '',
      show_name: true,
    });
    expect(cfg.branding?.store_name.en).toBe('Lamp Shop');
    expect(cfg.texts).toEqual({ 'Home.valueTitle': { vi: 'Vì sao chọn name bchúng tôi/b' } });
  });

  it('keeps contact rows with a bad link as text, defaults the kind, and drops empty labels', () => {
    const cfg = sanitizeStorefrontConfig({
      template_id: 'classic',
      footer: {
        contact: [
          { label: 'Shop', href: 'javascript:alert(1)' },
          { label: '   ', href: '/store' },
          { label: 'Mail', href: 'mailto:a@b.co', kind: 'weird' },
        ],
      },
    });
    expect(cfg.footer?.contact).toEqual([
      { label: 'Shop', href: '', kind: 'link' },
      { label: 'Mail', href: 'mailto:a@b.co', kind: 'link' },
    ]);
  });

  it('does not mistake options like image_side for image URLs', () => {
    const cfg = sanitizeStorefrontConfig({
      template_id: 'classic',
      home: [
        {
          id: 'iwt',
          type: 'image-with-text',
          settings: {
            image_side: 'right',
            image: '/media/a-1.png',
            button_link: '/store',
            style: 'pills',
            link_color: 'x',
          },
        },
      ],
    });
    expect(cfg.home?.[0].settings).toEqual({
      image_side: 'right',
      image: '/media/a-1.png',
      button_link: '/store',
      style: 'pills',
      link_color: 'x',
    });
  });

  it('sanitizes the floating contact buttons (phone, Zalo, position, Vietnam-only)', () => {
    const cfg = sanitizeStorefrontConfig({
      template_id: 'classic',
      contact_widget: {
        enabled: true,
        phone: '0866 063 804<script>',
        zalo: '0866063804',
        position: 'left',
        vn_only: false,
      },
    });
    expect(cfg.contact_widget).toEqual({
      enabled: true,
      phone: '0866 063 804',
      zalo: '0866063804',
      position: 'left',
      vn_only: false,
    });
    // defaults when fields are missing: right side, Vietnam only
    expect(sanitizeStorefrontConfig({ contact_widget: { enabled: true } }).contact_widget).toEqual({
      enabled: true,
      phone: '',
      zalo: '',
      position: 'right',
      vn_only: true,
    });
    expect(sanitizeStorefrontConfig({}).contact_widget).toBeNull();
  });

  it('only accepts safe Zalo values and tidy phone numbers', () => {
    expect(cleanZalo('https://zalo.me/0866063804')).toBe('https://zalo.me/0866063804');
    expect(cleanZalo('https://chat.zalo.me/?id=1')).toBe('https://chat.zalo.me/?id=1');
    expect(cleanZalo('+84 866 063 804')).toBe('+84866063804');
    expect(cleanZalo('https://evil.com/zalo.me/1')).toBe('');
    expect(cleanZalo('javascript:alert(1)')).toBe('');
    expect(cleanZalo('12')).toBe('');
    expect(cleanPhone('(028) 3822-1234 ext<b>')).toBe('(028) 3822-1234');
  });

  it('accepts zalo as a footer contact kind', () => {
    const cfg = sanitizeStorefrontConfig({
      footer: { contact: [{ label: '0866 063 804', kind: 'zalo' }] },
    });
    expect(cfg.footer?.contact).toEqual([{ label: '0866 063 804', href: '', kind: 'zalo' }]);
  });
});
