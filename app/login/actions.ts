"use server";

import { createClient } from "@/lib/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function updateUserAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image to upload.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Avatar must be 5MB or smaller.");
  }
  if (!AVATAR_TYPES.has(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }

  const ext = extensionForMime(file.type);
  const path = `${user.id}/avatar.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Avatar upload failed (${uploadError.message}). Apply migration 20260821000006_user_avatars.sql if the bucket is missing.`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;
  const { error: metaError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });
  if (metaError) throw new Error(metaError.message);

  revalidatePath("/workspace", "layout");
  return { avatarUrl };
}

export async function removeUserAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: files } = await supabase.storage
    .from("avatars")
    .list(user.id);
  if (files?.length) {
    await supabase.storage
      .from("avatars")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/workspace", "layout");
}
