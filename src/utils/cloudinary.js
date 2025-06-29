import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { console } from "inspector";
import { CLIENT_RENEG_LIMIT } from "tls";

// Set your Cloudinary config (either here or via environment variables)
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // or hardcode temporarily
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });
cloudinary.config({
  cloud_name: "dldgntdiw", // or hardcode temporarily
  api_key: "611552425782432",
  api_secret: "QjEDv1Ov3YLYt3k41oOSpqyMJf8"
});
console.log("Cloudinary config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  hasSecret: !!process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath || !fs.existsSync(localFilePath)) {
    console.log("Invalid file path for upload:", localFilePath);
    return null;
  }

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    });

    // Optional: delete file after upload
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

const deleteFromCloudinary = async (publicID) => {
    try {
       const result = await cloudinary.uploader.destroy(publicID)
       console.log("Deleted from cloudinary... Public ID : ", publicID)
    } catch (error) {
        console.log("Error deleting from cloudinary...", error)
        return null
    }
}

export { uploadOnCloudinary , deleteFromCloudinary};
