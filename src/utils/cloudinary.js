import { v2 as cloudinary } from 'cloudinary';  
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// configure cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) return null;

    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: 'auto',
    });

    console.log('File uploaded successfully:', response.url); 

    fs.unlinkSync(localfilepath); // ✅ correct method to delete file
    return response;

  } catch (error) {
    console.log('Error uploading file to Cloudinary:', error);
    fs.unlinkSync(localfilepath); // ✅ fix typo here
    return null;
  }
};

export { uploadOnCloudinary };
