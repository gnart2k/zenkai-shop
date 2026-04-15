import { Photo, Trash } from '@medusajs/icons';
import type { AdminProductCategory, DetailWidgetProps } from '@medusajs/types';
import { Button, Container, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { sdk } from '../lib/client';

type CategoryImage = {
  id: string;
  url: string;
  file_id: string | null;
  type: 'thumbnail' | 'image';
  category_id: string;
};

const CategoryImagesWidget = ({ data: category }: DetailWidgetProps<AdminProductCategory>) => {
  const queryClient = useQueryClient();

  const [images, setImages] = useState<CategoryImage[]>([]);

  const { isLoading: isLoadingImages } = useQuery({
    queryKey: ['category-images', category.id],
    queryFn: async () => {
      const res = await sdk.client.fetch(`/admin/product-categories/${category.id}/images`, {
        method: 'GET',
      });
      return res.images as CategoryImage[];
    },
    onSuccess: (data) => {
      setImages(data);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'thumbnail' | 'image' }) => {
      const uploadRes = await sdk.admin.upload.create({ files: [file] });
      const fileId = uploadRes.files?.[0]?.id;
      if (!fileId) {
        throw new Error('Upload did not return a file id');
      }

      const res = await sdk.client.fetch(`/admin/product-categories/${category.id}/images`, {
        method: 'POST',
        body: {
          url: uploadRes.files?.[0]?.url || '',
          file_id: fileId,
          type,
        },
      });
      return res.image as CategoryImage;
    },
    onSuccess: (newImage) => {
      queryClient.invalidateQueries({ queryKey: ['category-images', category.id] });
      setImages((prev) => [...prev, newImage]);
      toast.success('Image added');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Could not upload image');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await sdk.client.fetch(`/admin/product-categories/${category.id}/images/${imageId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, imageId) => {
      queryClient.invalidateQueries({ queryKey: ['category-images', category.id] });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image removed');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Could not remove image');
    },
  });

  const handleUpload = async (file: File | undefined, type: 'thumbnail' | 'image') => {
    if (!file) return;
    await uploadMutation.mutateAsync({ file, type });
  };

  const heroInputRef = typeof window !== 'undefined' ? { current: null } : null;
  const thumbInputRef = typeof window !== 'undefined' ? { current: null } : null;

  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);

  const mainImage = images.find((img) => img.type === 'image');
  const thumbnail = images.find((img) => img.type === 'thumbnail');

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

        {isLoadingImages ? (
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
              {mainImage ? (
                <div className="flex items-center gap-4">
                  <img
                    src={mainImage.url}
                    alt="Category main"
                    className="h-32 w-auto rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    size="small"
                    variant="transparent"
                    onClick={() => deleteMutation.mutate(mainImage.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash />
                    Remove
                  </Button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUpload(file, 'image');
                    }
                    e.target.value = '';
                  }}
                />
              )}
              {!mainImage && (
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        await handleUpload(file, 'image');
                      }
                    };
                    input.click();
                  }}
                  disabled={uploadMutation.isPending}
                >
                  <Photo />
                  Upload main image
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Text size="small" leading="compact" weight="plus">
                Thumbnail
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Small image shown in navigation menus.
              </Text>
              {thumbnail ? (
                <div className="flex items-center gap-4">
                  <img
                    src={thumbnail.url}
                    alt="Category thumbnail"
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    size="small"
                    variant="transparent"
                    onClick={() => deleteMutation.mutate(thumbnail.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash />
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        await handleUpload(file, 'thumbnail');
                      }
                    };
                    input.click();
                  }}
                  disabled={uploadMutation.isPending}
                >
                  <Photo />
                  Upload thumbnail
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default CategoryImagesWidget;
