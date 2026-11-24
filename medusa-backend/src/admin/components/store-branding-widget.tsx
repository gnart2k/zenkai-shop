import { Photo, Trash } from '@medusajs/icons';
import type { AdminStore, DetailWidgetProps } from '@medusajs/types';
import { Button, Container, Input, Label, Text, toast } from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type RefObject, useEffect, useRef, useState } from 'react';
import type { StoreBrandingMetadata } from '../../types/store-branding';
import { sdk } from '../lib/client';
import { StoreBrandingFilePreview } from './store-branding-file-preview';

type AssetKey = 'logo' | 'hero' | 'favicon';

const StoreBrandingWidget = ({ data }: DetailWidgetProps<AdminStore>) => {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoId, setLogoId] = useState<string | null>(null);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [faviconId, setFaviconId] = useState<string | null>(null);

  useEffect(() => {
    const b = (data.metadata?.branding ?? {}) as StoreBrandingMetadata;
    setTagline(b.tagline ?? '');
    setPrimaryColor(b.primary_color ?? '');
    setLogoId(b.logo_file_id?.trim() || null);
    setHeroId(b.hero_file_id?.trim() || null);
    setFaviconId(b.favicon_file_id?.trim() || null);
  }, [data.id, data.metadata]);

  const mutation = useMutation({
    mutationFn: async () => {
      const branding: StoreBrandingMetadata = {
        tagline: tagline.trim(),
        primary_color: primaryColor.trim(),
        logo_file_id: logoId ?? '',
        hero_file_id: heroId ?? '',
        favicon_file_id: faviconId ?? '',
      };
      await sdk.admin.store.update(data.id, {
        metadata: {
          ...(data.metadata ?? {}),
          branding,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      toast.success('Storefront branding saved');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Could not save branding');
    },
  });

  const uploadFile = async (file: File) => {
    const res = await sdk.admin.upload.create({ files: [file] });
    const id = res.files?.[0]?.id;
    if (!id) {
      throw new Error('Upload did not return a file id');
    }
    return id;
  };

  const onPickFile = async (file: File | undefined, key: AssetKey) => {
    if (!file) {
      return;
    }
    try {
      const id = await uploadFile(file);
      if (key === 'logo') {
        setLogoId(id);
      } else if (key === 'hero') {
        setHeroId(id);
      } else {
        setFaviconId(id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const clearAsset = (key: AssetKey) => {
    if (key === 'logo') {
      setLogoId(null);
    } else if (key === 'hero') {
      setHeroId(null);
    } else {
      setFaviconId(null);
    }
  };

  const renderAsset = (
    key: AssetKey,
    label: string,
    description: string,
    fileId: string | null,
    inputRef: RefObject<HTMLInputElement | null>
  ) => (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Text size="small" leading="compact" weight="plus">
          {label}
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {description}
        </Text>
      </div>
      <StoreBrandingFilePreview fileId={fileId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onPickFile(e.target.files?.[0], key);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={mutation.isPending}
        >
          <Photo />
          {fileId ? 'Replace' : 'Upload'}
        </Button>
        {fileId ? (
          <Button
            type="button"
            size="small"
            variant="transparent"
            onClick={() => clearAsset(key)}
            disabled={mutation.isPending}
          >
            <Trash />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex flex-col gap-1">
          <Text size="small" leading="compact" weight="plus">
            Storefront branding
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Shown on your storefront home page. Store name is managed in the fields above (
            {data.name}).
          </Text>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="branding-tagline">Tagline</Label>
          <Input
            id="branding-tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Short line under your brand name"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="branding-primary">Primary color</Label>
          <Input
            id="branding-primary"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#111827"
          />
          <Text size="small" className="text-ui-fg-subtle">
            CSS color (hex or keyword) for accents on the storefront.
          </Text>
        </div>

        {renderAsset(
          'hero',
          'Hero image',
          'Large background for the home hero section.',
          heroId,
          heroInputRef
        )}
        {renderAsset(
          'logo',
          'Logo',
          'Displayed in the hero and navigation when the storefront uses it.',
          logoId,
          logoInputRef
        )}
        {renderAsset(
          'favicon',
          'Favicon',
          'Small icon for browser tabs (square image recommended).',
          faviconId,
          faviconInputRef
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            size="small"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save branding
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default StoreBrandingWidget;
