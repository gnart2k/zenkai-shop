import { Photo, Trash } from '@medusajs/icons';
import type { AdminProductCategory, DetailWidgetProps } from '@medusajs/types';
import { Button, Container, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { sdk } from '../lib/client';

type CategoryImage = {
  id: string;
  url: string;
  file_id: string | null;
  type: 'thumbnail' | 'image';
  category_id: string;
};

/** New image that has been uploaded to the file service but not yet linked to the category. */
type StagedUpload = {
  url: string;
  file_id: string;
  type: 'thumbnail' | 'image';
};

const CategoryImagesWidget = ({ data: category }: DetailWidgetProps<AdminProductCategory>) => {
  const queryClient = useQueryClient();

  const { data: fetchedImages = [], isLoading } = useQuery({
    queryKey: ['category-images', category.id],
    queryFn: async () => {
      const res = await sdk.client.fetch(`/admin/product-categories/${category.id}/images`, {
        method: 'GET',
      });
      return (res.images ?? []) as CategoryImage[];
    },
  });

  const [uploads, setUploads] = useState<StagedUpload[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const isSaving = useRef(false);

  const hasChanges = uploads.length > 0 || deleteIds.length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      isSaving.current = true;
      for (const img of deleteIds) {
        await sdk.client.fetch(`/admin/product-categories/${category.id}/images/${img}`, {
          method: 'DELETE',
        });
      }
      for (const up of uploads) {
        await sdk.client.fetch(`/admin/product-categories/${category.id}/images`, {
          method: 'POST',
          body: { url: up.url, file_id: up.file_id, type: up.type },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-images', category.id] });
      setUploads([]);
      setDeleteIds([]);
      setPreviewUrls({});
      isSaving.current = false;
      toast.success('Changes saved');
    },
    onError: (e: Error) => {
      isSaving.current = false;
      toast.error(e.message || 'Could not save changes');
    },
  });

  const doUpload = async (file: File, type: 'thumbnail' | 'image') => {
    const res = await sdk.admin.upload.create({ files: [file] });
    const fileId = res.files?.[0]?.id;
    const url = res.files?.[0]?.url;
    if (!fileId || !url) throw new Error('Upload did not return a file id');
    setUploads((prev) => [...prev.filter((u) => u.type !== type), { url, file_id: fileId, type }]);
    setPreviewUrls((prev) => ({ ...prev, [type]: URL.createObjectURL(file) }));
  };

  const handleSelectFile = (type: 'thumbnail' | 'image') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        await doUpload(file, type);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      }
    };
    input.click();
  };

  const handleRemove = (type: 'thumbnail' | 'image') => {
    const existing = fetchedImages.find((img) => img.type === type);
    if (existing) {
      setDeleteIds((prev) => [...prev.filter((id) => id !== existing.id), existing.id]);
      setUploads((prev) => prev.filter((u) => u.type !== type));
    }
    setPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const handleSave = () => {
    if (!hasChanges || isSaving.current) return;
    saveMutation.mutate();
  };

  const handleDiscard = () => {
    setUploads([]);
    setDeleteIds([]);
    setPreviewUrls({});
  };

  const getImageSrc = (type: 'thumbnail' | 'image') => {
    if (previewUrls[type]) return previewUrls[type];
    const existing = fetchedImages.find((img) => img.type === type);
    if (existing && !deleteIds.includes(existing.id)) return existing.url;
    return null;
  };

  const isPendingDelete = (type: 'thumbnail' | 'image') => {
    const existing = fetchedImages.find((img) => img.type === type);
    return existing ? deleteIds.includes(existing.id) : false;
  };

  const pendingUpload = (type: 'thumbnail' | 'image') => uploads.find((u) => u.type === type);

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex flex-col gap-1">
          <Text size="small" leading="compact" weight="plus">
            Category images
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Images displayed on your storefront. Used for category pages and megamenus.
          </Text>
        </div>

        {isLoading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading images...
          </Text>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Text size="small" leading="compact" weight="plus">
                Main image
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Large banner image shown on category pages.
              </Text>

              {pendingUpload('image') ? (
                <div className="flex items-center gap-4">
                  <img
                    src={previewUrls.image!}
                    alt="Main preview"
                    className="h-32 w-auto rounded-md object-cover"
                  />
                  <div className="flex flex-col gap-1">
                    <Text size="small" weight="plus">
                      Ready to save
                    </Text>
                    <Button
                      type="button"
                      size="small"
                      variant="transparent"
                      onClick={() => {
                        setUploads((prev) => prev.filter((u) => u.type !== 'image'));
                        setPreviewUrls((prev) => {
                          const next = { ...prev };
                          delete next.image;
                          return next;
                        });
                      }}
                      disabled={saveMutation.isPending}
                    >
                      <Trash />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : getImageSrc('image') ? (
                <div className="flex items-center gap-4">
                  <img
                    src={getImageSrc('image')!}
                    alt="Category main"
                    className="h-32 w-auto rounded-md object-cover"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      onClick={() => handleSelectFile('image')}
                      disabled={saveMutation.isPending}
                    >
                      <Photo />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      variant="transparent"
                      onClick={() => handleRemove('image')}
                      disabled={saveMutation.isPending}
                    >
                      <Trash />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => handleSelectFile('image')}
                  disabled={saveMutation.isPending}
                >
                  <Photo />
                  Upload main image
                </Button>
              )}

              {isPendingDelete('image') && !pendingUpload('image') && (
                <Text size="small" className="text-ui-fg-muted">
                  Will be removed on save
                </Text>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Text size="small" leading="compact" weight="plus">
                Thumbnail
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Small image shown in navigation menus.
              </Text>

              {pendingUpload('thumbnail') ? (
                <div className="flex items-center gap-4">
                  <img
                    src={previewUrls.thumbnail!}
                    alt="Thumbnail preview"
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div className="flex flex-col gap-1">
                    <Text size="small" weight="plus">
                      Ready to save
                    </Text>
                    <Button
                      type="button"
                      size="small"
                      variant="transparent"
                      onClick={() => {
                        setUploads((prev) => prev.filter((u) => u.type !== 'thumbnail'));
                        setPreviewUrls((prev) => {
                          const next = { ...prev };
                          delete next.thumbnail;
                          return next;
                        });
                      }}
                      disabled={saveMutation.isPending}
                    >
                      <Trash />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : getImageSrc('thumbnail') ? (
                <div className="flex items-center gap-4">
                  <img
                    src={getImageSrc('thumbnail')!}
                    alt="Category thumbnail"
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      onClick={() => handleSelectFile('thumbnail')}
                      disabled={saveMutation.isPending}
                    >
                      <Photo />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      variant="transparent"
                      onClick={() => handleRemove('thumbnail')}
                      disabled={saveMutation.isPending}
                    >
                      <Trash />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => handleSelectFile('thumbnail')}
                  disabled={saveMutation.isPending}
                >
                  <Photo />
                  Upload thumbnail
                </Button>
              )}

              {isPendingDelete('thumbnail') && !pendingUpload('thumbnail') && (
                <Text size="small" className="text-ui-fg-muted">
                  Will be removed on save
                </Text>
              )}
            </div>

            {hasChanges && (
              <div className="flex items-center gap-2 pt-2 border-t border-ui-border-base">
                <Button
                  type="button"
                  size="small"
                  variant="primary"
                  onClick={handleSave}
                  isLoading={saveMutation.isPending}
                >
                  Save changes
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={handleDiscard}
                  disabled={saveMutation.isPending}
                >
                  Discard
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  );
};

export default CategoryImagesWidget;
