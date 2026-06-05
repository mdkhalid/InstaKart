"use client";

import { useRef, useState } from "react";
import { Upload, X, Star } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export type ProductImage = {
  id?: string;
  url: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

type Props = {
  productId?: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxFiles?: number;
};

const toAbsolute = (url: string) =>
  url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`;

export function ImageUploader({ productId, images, onChange, maxFiles = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (productId) {
      // Product exists -> upload straight to server
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));
      setUploading(true);
      try {
        const { data } = await api.post(`/products/${productId}/images`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const fresh: ProductImage[] = data?.data?.images || [];
        onChange([...images, ...fresh]);
        toast.success(`${fresh.length} image(s) uploaded`);
      } catch {
        toast.error("Image upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    } else {
      // Product not yet created -> hold as local object URLs until form submit
      const locals: ProductImage[] = Array.from(files).map((f, i) => ({
        url: URL.createObjectURL(f),
        file: f,
        sortOrder: images.length + i,
        isPrimary: images.length === 0 && i === 0,
      })) as any;
      onChange([...images, ...locals]);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = async (idx: number) => {
    const img = images[idx];
    if (productId && img.id) {
      try {
        await api.delete(`/products/${productId}/images/${img.id}`);
      } catch {
        toast.error("Failed to delete image");
        return;
      }
    }
    const next = images.filter((_, i) => i !== idx);
    // Reassign primary if we removed the primary one
    if (img.isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  };

  const setPrimary = (idx: number) => {
    onChange(
      images.map((img, i) => ({ ...img, isPrimary: i === idx })),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Product Images</label>
        <span className="text-xs text-gray-500">
          {images.length} / {maxFiles} {images.length === 1 ? "image" : "images"}
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id || img.url}
              className="relative group border rounded-lg overflow-hidden bg-gray-50 aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toAbsolute(img.url)}
                alt=""
                className="w-full h-full object-cover"
              />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-yellow-400 text-xs px-1.5 py-0.5 rounded font-medium">
                  Primary
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    className="bg-white/90 p-1.5 rounded text-xs flex items-center gap-1 hover:bg-white"
                  >
                    <Star className="h-3 w-3" /> Primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || images.length >= maxFiles}
          className="hidden"
          id="image-upload-input"
        />
        <label
          htmlFor="image-upload-input"
          className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 text-sm cursor-pointer hover:bg-gray-50 ${
            uploading || images.length >= maxFiles ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Upload className="h-4 w-4" />
          {uploading
            ? "Uploading..."
            : images.length >= maxFiles
              ? `Maximum ${maxFiles} images reached`
              : productId
                ? "Click to upload more images"
                : "Click to select images (uploaded after product is created)"}
        </label>
      </div>
    </div>
  );
}
