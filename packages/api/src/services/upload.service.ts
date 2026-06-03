import fs from "fs";
import path from "path";
// import { v2 as cloudinary } from "cloudinary";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

// ────────────────────────────────────────────────────────────
// TODO: Switch to Cloudinary for production
// Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars
// 1. Uncomment the cloudinary import above
// 2. Uncomment the cloudinary config + uploadToCloudinary + deleteFromCloudinary below
// 3. Comment out or remove the local fallback functions
// ────────────────────────────────────────────────────────────

// import { v2 as cloudinary } from "cloudinary";
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

export const uploadImage = async (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<string> => {
  // TODO: Swap to uploadToCloudinary when Cloudinary is configured
  return uploadToLocal(buffer, folder, publicId);
};

// async function uploadToCloudinary(
//   buffer: Buffer,
//   folder: string,
//   publicId?: string
// ): Promise<string> {
//   return new Promise<string>((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       {
//         folder: `instamart/${folder}`,
//         public_id: publicId,
//         overwrite: true,
//         resource_type: "image",
//       },
//       (err, result) => {
//         if (err) reject(err);
//         else resolve(result!.secure_url);
//       }
//     );
//     stream.end(buffer);
//   });
// }

async function uploadToLocal(
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<string> {
  const targetDir = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = getImageExtension(buffer);
  const filename = publicId ? `${publicId}.${ext}` : `${Date.now()}.${ext}`;
  const filePath = path.join(targetDir, filename);

  fs.writeFileSync(filePath, buffer);

  return `/uploads/${folder}/${filename}`;
}

function getImageExtension(buffer: Buffer): string {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "webp";
  return "jpg";
}

export const deleteImage = async (_publicId: string) => {
  // TODO: Implement Cloudinary delete when switching
  // Files are overwritten on re-upload with same publicId
};
