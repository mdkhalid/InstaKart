"use client";

import { useRef } from "react";
import Image from "next/image";
import { Camera, User } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: { container: "h-8 w-8", icon: "h-4 w-4", text: "text-xs", camera: "h-3 w-3", cameraBtn: "p-1", imageSize: 32 },
  md: { container: "h-16 w-16", icon: "h-8 w-8", text: "text-sm", camera: "h-3 w-3", cameraBtn: "p-1.5", imageSize: 64 },
  lg: { container: "h-24 w-24", icon: "h-12 w-12", text: "text-lg", camera: "h-4 w-4", cameraBtn: "p-2", imageSize: 96 },
};

type AvatarSize = keyof typeof sizeClasses;

interface AvatarUploadProps {
  /** Current avatar image URL */
  src?: string | null;
  /** Local preview URL (e.g. from URL.createObjectURL) shown before upload completes */
  previewUrl?: string | null;
  /** Fallback initials displayed when no image is available */
  initials?: string;
  /** Alt text for the image */
  alt?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Whether an upload is in progress */
  uploading?: boolean;
  /** Upload callback. If not provided, the upload button is hidden */
  onUpload?: (file: File) => void;
  /** Additional CSS classes for the container */
  className?: string;
}

export function AvatarUpload({
  src,
  previewUrl,
  initials,
  alt = "Avatar",
  size = "md",
  uploading = false,
  onUpload,
  className,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const classes = sizeClasses[size];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    onUpload(file);
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full bg-primary-100 flex items-center justify-center overflow-hidden",
          classes.container
        )}
      >
        {previewUrl || src ? (
          <Image
            src={previewUrl || src!}
            alt={alt}
            width={classes.imageSize}
            height={classes.imageSize}
            className="object-cover w-full h-full"
            style={{ width: "auto", height: "auto" }}
          />
        ) : initials ? (
          <span className={cn("font-semibold text-primary-700", classes.text)}>
            {initials}
          </span>
        ) : (
          <User className={cn("text-primary-600", classes.icon)} />
        )}
      </div>

      {onUpload && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              classes.cameraBtn
            )}
            title={uploading ? "Uploading..." : "Upload avatar"}
          >
            <Camera className={classes.camera} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            data-testid="file-input"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
