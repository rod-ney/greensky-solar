"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { getInitials } from "@/lib/client-session";

type Props = {
  avatarUrl?: string | null;
  name: string;
  onUploadComplete: (profile: { avatarUrl?: string | null }) => void;
  size?: "md" | "lg";
};

const sizeClasses = { md: "h-16 w-16", lg: "h-24 w-24" };

export default function AvatarUpload({
  avatarUrl,
  name,
  onUploadComplete,
  size = "md",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Use JPEG, PNG, GIF, or WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Maximum size is 2MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onUploadComplete(data);
      } else {
        setError(data.error ?? "Upload failed.");
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const initials = getInitials(name);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`relative shrink-0 overflow-hidden rounded-full bg-brand/20 ring-2 ring-transparent hover:ring-brand/50 transition-all disabled:opacity-70 ${sizeClasses[size]}`}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
            unoptimized={avatarUrl.startsWith("data:")}
          />
        ) : (
          <span className={`flex h-full w-full items-center justify-center font-bold text-brand ${size === "lg" ? "text-2xl" : "text-xl"}`}>
            {initials}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
